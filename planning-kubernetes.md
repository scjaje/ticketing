# Planning a Kubernetes setup

This walks through *why* the files in `infra/k8s/` and `skaffold.yaml` look
the way they do, so the reasoning transfers to a project you design from
scratch — not just this one. Pairs with [README.md](README.md), which is
the step-by-step checklist; this one is the "why" behind each piece.

## The big picture

A microservices app is a bunch of small, independently-deployable
processes (`auth`, `tickets`, `orders`, `client`, ...) that need to:

1. Run somewhere, restart themselves if they crash, and scale if needed.
2. Find and talk to each other without hardcoded IPs.
3. Share configuration/secrets without baking them into the Docker image.
4. Be reachable from outside the cluster (the browser hitting the API).
5. Be easy to spin up and iterate on locally.

Kubernetes solves 1-4. Skaffold solves 5 (it's a dev-loop tool that sits
*on top of* Kubernetes — it builds images, applies your manifests, and
keeps things in sync as you edit code; it isn't a separate technology).

Everything below maps one of those five needs to a concrete piece of YAML
in this repo.

## Deployments (`*-depl.yaml`, the Deployment half)

Example, `infra/k8s/tickets-depl.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tickets-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tickets
  template:
    metadata:
      labels:
        app: tickets
    spec:
      containers:
        - name: tickets
          image: scjaje/tickets
          resources:
            requests:
              cpu: '100m'
              memory: '128Mi'
            limits:
              cpu: '300m'
              memory: '256Mi'
          env:
            - name: JWT_KEY
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: JWT_KEY
            - name: MONGO_URI
              value: 'mongodb://tickets-mongo-srv:27017/tickets'
            - name: NATS_URL
              value: 'http://nats-srv:4222'
            - name: NATS_CLUSTER_ID
              value: ticketing
            - name: NATS_CLIENT_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

### Why a Deployment and not just a Pod?

A bare Pod, if it crashes or the node dies, just stays dead. A
**Deployment** is a controller that watches over a set of Pods and
guarantees "there should always be N of these running" — it recreates
Pods that die, and it knows how to do rolling updates when you change the
image. You almost never create a raw Pod by hand; Deployment is the
standard wrapper.

### Field-by-field

- `spec.replicas` — how many identical Pods to keep running. `1` here
  because this is local dev, not something scaled for traffic.
- `spec.selector.matchLabels` / `template.metadata.labels` — **these two
  must match**. This is how the Deployment knows which Pods belong to it.
  The label (`app: tickets`) is also what the matching *Service* (below)
  uses to find these Pods. It's the glue between every object on this
  page.
- `template` — the actual Pod spec that gets stamped out `replicas`
  times. Everything under `template.spec` is standard Pod config.
- `containers[].image` — `scjaje/tickets`, i.e. our own image (see the
  "our image vs. third-party image" note in [README.md](README.md)).
- `resources.requests` / `resources.limits` — `requests` is what the
  scheduler reserves for this Pod when deciding which node to place it on;
  `limits` is the hard ceiling — the container gets OOM-killed or CPU
  throttled past this. Setting both is good practice even in dev so one
  runaway service can't starve the others.
- `env` — plain `value:` for non-secret config (Mongo URI, NATS cluster
  id), `valueFrom.secretKeyRef` for anything sensitive (see Secrets
  below), and `valueFrom.fieldRef` for values pulled from the Pod's own
  metadata — `NATS_CLIENT_ID` uses `metadata.name` so every replica gets a
  distinct, auto-generated client id without us hardcoding one.

### Things that could be added but aren't (yet)

- **`livenessProbe` / `readinessProbe`** — HTTP or TCP checks Kubernetes
  polls to know if a container is alive and ready for traffic. Without
  them, Kubernetes only knows a process is *running*, not that it's
  actually healthy (e.g. still connected to Mongo).
- **`imagePullPolicy`** — defaults to `IfNotPresent` for non-`:latest`
  tags. Since these images have no explicit tag (implicitly `:latest`),
  Kubernetes actually defaults to `Always` — worth knowing, since it means
  a plain `kubectl apply` (no skaffold) will try to re-pull instead of
  using the locally-built image, which can bite you.
- **`volumeMounts` / `volumes`** — for mounting a PersistentVolumeClaim,
  ConfigMap, or Secret as a file instead of an env var.
- **`strategy`** — controls rolling-update behavior (max surge/unavailable)
  when you ship a new image version.

## Services (`*-depl.yaml`, the Service half)

Same file, second document (`---` separates multiple manifests in one
YAML file):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tickets-srv
spec:
  selector:
    app: tickets
  ports:
    - name: tickets
      protocol: TCP
      port: 3000
      targetPort: 3000
```

### Why

Pods are ephemeral — they get new IPs every time they restart. A
**Service** is a stable DNS name + virtual IP that load-balances across
whatever Pods currently match its `selector`. Every other Pod in the
cluster can reach this one by hostname alone —
`http://tickets-srv:3000` — because Kubernetes' internal DNS resolves
Service names automatically. That's how `orders-depl.yaml` reaches Mongo
via `mongodb://orders-mongo-srv:27017/orders` without knowing any real IP.

- `selector` — same label-matching mechanic as the Deployment; this is
  what tells the Service which Pods to send traffic to.
- `port` — the port other things inside the cluster use to talk to this
  Service.
- `targetPort` — the port the container actually listens on. They happen
  to both be `3000` here, but they don't have to match.
- No `type:` specified → defaults to **ClusterIP**, meaning "only
  reachable from inside the cluster." That's intentional for
  `tickets-srv`, `orders-srv`, and every `*-mongo-srv` — nothing outside
  the cluster should ever talk to Mongo directly. The only thing that
  needs to be reachable from *outside* is the Ingress controller (below).

### Other Service types that exist

- **`NodePort`** — opens a static port on every node; mostly a stepping
  stone, rarely used directly in real setups.
- **`LoadBalancer`** — asks the cloud provider (AWS/GCP/etc.) to provision
  an external load balancer. Not applicable to local dev clusters.
- **`ExternalName`** — a DNS-only alias to something outside the cluster.

## Ingress (`ingress-srv.yaml`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    nginx.ingress.kubernetes.io/use-regex: 'true'
spec:
  ingressClassName: nginx
  rules:
    - host: ticketing.com
      http:
        paths:
          - path: /api/users/?(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: auth-srv
                port:
                  number: 3000
          - path: /api/tickets/?(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: tickets-srv
                port:
                  number: 3000
          - path: /?(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: client-srv
                port:
                  number: 3000
```

### Why we need this at all

All the Services above are ClusterIP — invisible from outside. Something
has to be the front door. That's the **Ingress**: a single entry point
that inspects the incoming request's host/path and routes it to the
right internal Service. Without it we'd need a separate `LoadBalancer`
Service per microservice, which is both wasteful and exposes internal
services that shouldn't be public.

Two moving pieces, easy to conflate:

1. **The Ingress resource** (this YAML) — just routing *rules*.
2. **An Ingress Controller** (e.g. `ingress-nginx`) — the actual piece of
   software that reads those rules and does the routing. It has to be
   installed into the cluster separately (it's not built into Kubernetes
   itself); `ingressClassName: nginx` is what tells Kubernetes which
   installed controller should implement these rules.

### Field notes

- `host: ticketing.com` — for local dev this only works if `ticketing.com`
  is pointed at your cluster's local IP in `/etc/hosts` (or `hosts` on
  Windows). Real DNS isn't involved locally.
- **Path order matters.** `/api/users/?(.*)` and `/api/tickets/?(.*)` are
  listed *before* the catch-all `/?(.*)` on purpose — nginx evaluates
  paths in order and a broad pattern placed first would swallow every
  request before the specific API routes ever got a chance.
- `use-regex: 'true'` + the `?(.*)` pattern is what lets a path like
  `/api/tickets/abc123` match `/api/tickets/?(.*)` instead of only exact
  matches.
- `pathType: ImplementationSpecific` hands interpretation of the path
  string to the controller (nginx's regex rules), as opposed to `Exact` or
  `Prefix` which Kubernetes itself interprets literally.

### What else commonly lives here

- **TLS** — a `tls:` block + a Secret holding a cert, for HTTPS.
- **Multiple hosts** — one Ingress can route several domains, not just one.
- **Rewrite annotations** — e.g. stripping a path prefix before it reaches
  the backend service.

## `skaffold.yaml`

```yaml
apiVersion: skaffold/v4beta11
kind: Config
manifests:
  rawYaml:
    - ./infra/k8s/*
build:
  local:
    push: false
  artifacts:
    - image: scjaje/tickets
      context: tickets
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "src/**/*.ts"
            dest: .
```

### What problem this solves

Without skaffold, your dev loop is manually: edit code → `docker build` →
`docker push` (or load) → `kubectl apply` → wait → check logs → repeat.
Skaffold automates that whole loop: `skaffold dev` builds every artifact,
applies the manifests, watches your files, and rebuilds/re-syncs/streams
logs automatically as you edit.

### Field notes

- `manifests.rawYaml` — the literal list of YAML files to `kubectl apply`.
  A glob (`./infra/k8s/*`) means "every file in this folder is part of the
  deployed app" — which is exactly why forgetting to add a new
  `*-depl.yaml` there means it never gets deployed, and forgetting to add
  its image below means it gets deployed but never rebuilt/log-streamed
  (see the gotcha in [README.md](README.md)).
- `build.local.push: false` — build the image straight into the local
  Docker daemon (or the cluster's own Docker, depending on cluster type)
  instead of pushing it to Docker Hub / a registry first. For local
  clusters (Docker Desktop, kind, minikube with the right driver) the
  cluster can see locally-built images directly, so there's no reason to
  round-trip through a registry on every save.
- `build.artifacts[].image` — must exactly match the `image:` field used
  in the corresponding `-depl.yaml`. This is how skaffold knows *which*
  Deployment to redeploy when it rebuilds this image.
- `context` — the directory sent to Docker as the build context (usually
  the service's own folder, so `COPY . .` in its Dockerfile only sees that
  service's files).
- `docker.dockerfile` — defaults to `Dockerfile` anyway; explicit here for
  clarity.
- `sync.manual` — instead of doing a full image rebuild + redeploy for
  every file change, skaffold copies matching files (`src/**/*.ts`)
  straight into the running container at `dest`. This only works because
  each service's `Dockerfile` runs it through something like `nodemon` /
  `tsx watch`, which picks up the change and restarts the process itself
  — skaffold's job ends at "get the new file into the container."

### Other things `skaffold.yaml` commonly has

- **`deploy:`** — an alternative/companion to `manifests.rawYaml` for
  deploying via `kubectl`, `helm`, or `kustomize` explicitly, with more
  control (namespaces, flags, etc.).
- **`portForward:`** — auto-forwards a Service port to localhost, handy if
  you're not using an Ingress/Ingress Controller locally.
- **`profiles:`** — named overrides of the whole config, e.g. a `prod`
  profile that pushes to a real registry and applies different resource
  limits, selected with `skaffold run -p prod`.
- **`build.local.useBuildkit` / cluster / GCB builders** — alternatives to
  building on your own machine (e.g. building inside the cluster with
  Kaniko, or using Google Cloud Build).

## Secrets (used, but not defined in any tracked YAML)

`jwt-secret` is referenced via `secretKeyRef` but there's no
`jwt-secret.yaml` in this repo — on purpose. Secrets shouldn't be committed
to source control even base64-encoded (which is *not* encryption, just
encoding). Instead they're created imperatively once per cluster:

```bash
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=some_value_here
```

Any Deployment that needs it just references it by name via
`secretKeyRef`, same as `tickets-depl.yaml` and `orders-depl.yaml` both do
for `JWT_KEY`. If you rebuild the cluster from scratch, recreating secrets
like this is a manual step worth writing down somewhere per-project (a
`SECRETS.md` or similar, deliberately excluded from git).

## How to plan this for a *new* project

Roughly the order decisions actually get made, not the order files get
written:

1. **List the bounded contexts** (services). Each one gets its own
   directory, database (if stateful), and Docker image. Resist sharing a
   database between services — it's the #1 thing that quietly re-couples
   a "microservices" app.
2. **Decide how services talk to each other.** Synchronous (HTTP, one
   Service calling another's ClusterIP by name) vs. asynchronous
   (events through something like NATS/Kafka, as `NATS_URL` here). This
   determines which env vars each Deployment needs.
3. **Decide what's public vs. internal.** Only things end users hit
   directly (the `client`, and API routes under `/api/...`) need Ingress
   paths. Everything else — Mongo instances, the event bus — stays
   ClusterIP-only, no Ingress entry, ever.
4. **Write the Deployment + Service pair per service**, copying the shape
   of an existing one and swapping names/ports/env vars.
5. **Write the Ingress rules**, specific paths before the catch-all.
6. **Wire skaffold last** — it's just "how do I build and ship the things
   I already decided on," not a design decision itself.

## Resources

- Kubernetes docs — concepts overview:
  https://kubernetes.io/docs/concepts/
- Kubernetes docs — Deployments:
  https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes docs — Services:
  https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes docs — Ingress:
  https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx (the controller referenced by `ingressClassName: nginx`):
  https://kubernetes.github.io/ingress-nginx/
- Skaffold docs:
  https://skaffold.dev/docs/
- `kubectl` cheat sheet:
  https://kubernetes.io/docs/reference/kubectl/cheatsheet/

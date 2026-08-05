# Adding a new service

Checklist for wiring up a new microservice in this repo, from source to a
running pod with logs showing up in `skaffold dev`.

## 1. Create the service directory

Same shape as `auth/`, `tickets/`, `orders/`: its own `package.json`,
`src/`, and a `Dockerfile`.

Minimal `Dockerfile` (copy from an existing service):

```dockerfile
FROM node:alpine

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY . .

CMD ["npm", "start"]
```

## 2. (Optional) Give it its own MongoDB

Only needed if the service persists data. Each service gets its **own**
Mongo instance — services never share a database.

Create `infra/k8s/<name>-mongo-depl.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <name>-mongo-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <name>-mongo
  template:
    metadata:
      labels:
        app: <name>-mongo
    spec:
      containers:
        - name: <name>-mongo
          image: mongo
---
apiVersion: v1
kind: Service
metadata:
  name: <name>-mongo-srv
spec:
  selector:
    app: <name>-mongo
  ports:
    - name: <name>-mongo
      protocol: TCP
      port: 27017
      targetPort: 27017
```

`image: mongo` here is the public Mongo image straight from Docker Hub —
see the "our image vs. someone else's image" note at the bottom.

## 3. Create the service's Deployment + Service

`infra/k8s/<name>-depl.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <name>-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <name>
  template:
    metadata:
      labels:
        app: <name>
    spec:
      containers:
        - name: <name>
          image: scjaje/<name>
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
              value: 'mongodb://<name>-mongo-srv:27017/<name>'
            - name: NATS_URL
              value: 'http://nats-srv:4222'
            - name: NATS_CLUSTER_ID
              value: ticketing
            - name: NATS_CLIENT_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
---
apiVersion: v1
kind: Service
metadata:
  name: <name>-srv
spec:
  selector:
    app: <name>
  ports:
    - name: <name>
      protocol: TCP
      port: 3000
      targetPort: 3000
```

Drop the `MONGO_URI` env var if the service has no database. Drop the NATS
vars if it doesn't publish/listen for events.

## 4. Expose routes through the ingress (only if it serves an API)

Add a path block to `infra/k8s/ingress-srv.yaml` pointing at the new
`<name>-srv`. Order matters — more specific paths need to come before the
catch-all `/?(.*)` client route:

```yaml
- path: /api/<name>/?(.*)
  pathType: ImplementationSpecific
  backend:
    service:
      name: <name>-srv
      port:
        number: 3000
```

If the service is purely internal (only talks to other services over
NATS, nothing hits it from outside), skip this step — it doesn't need an
ingress entry.

## 5. Register the image in `skaffold.yaml`

**This is the step it's easy to forget** — and forgetting it is exactly
what happened with `orders`: the pod still comes up and runs fine (`kubectl
get pods` shows `Running`, `0` restarts) because Kubernetes just pulls
whatever `scjaje/<name>` image already exists, but `skaffold dev` has no
idea that image belongs to it, so it never rebuilds it and never streams
its logs. No logs + healthy pod is the tell that this step got skipped.

Add an entry under `build.artifacts`:

```yaml
build:
  local:
    push: false
  artifacts:
    - image: scjaje/<name>
      context: <name>
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: 'src/**/*.ts'
            dest: .
```

- `image` must match the `image:` field in `infra/k8s/<name>-depl.yaml` exactly.
- `context` is the folder relative to `skaffold.yaml` (i.e. the service's own directory).
- The `sync` block is what lets skaffold hot-reload TS changes into the
  running container instead of doing a full rebuild every save.

Third-party images (`mongo`, `nats-streaming`) never get an artifacts
entry — skaffold has nothing to build for them, it just leaves Kubernetes
to pull them normally. See the note below.

## 6. Run it

```bash
skaffold dev
```

Watch for `[<name>] Connected to ...` / `[<name>] Listening on port 3000`
in the log output. If you don't see it, re-check step 5 first.

---

## Our image vs. a third-party image

- **Our own service** (`auth`, `tickets`, `orders`, `client`, a new one you
  add): we own the `Dockerfile`, so `image:` in the `-depl.yaml` is our
  Docker Hub namespace, e.g. `scjaje/orders`, and that same name/context
  must also be listed under `build.artifacts` in `skaffold.yaml` so
  skaffold knows to build it from source and stream its logs.
- **Someone else's prebuilt image** (`mongo`, `nats-streaming`): we don't
  have source for these, so `image:` in the `-depl.yaml` is just the
  public image name as-is. There's no `Dockerfile`, no build context, and
  no entry in `skaffold.yaml` — Kubernetes just pulls it straight from
  Docker Hub.

## Building and pushing manually (outside `skaffold dev`)

`skaffold dev` builds images locally and loads them straight into the
cluster (`build.local.push: false` in `skaffold.yaml`), so day-to-day you
don't need to push anywhere by hand. But if you want to build/tag/push an
image manually (e.g. to test the exact image a production manifest would
pull, or to publish it for someone else to `docker pull`):

```bash
# from inside the service's own directory, e.g. cd orders
docker build -t scjaje/orders .
docker push scjaje/orders
```

The tag after `-t` must match the `image:` field used in the service's
`-depl.yaml` (and in `skaffold.yaml`'s artifacts list) — that's the name
Kubernetes/skaffold will look for.

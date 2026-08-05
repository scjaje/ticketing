To create a secret for use in the cluster, you first start by running this command:

kubectl create secret generic jwt-secret --from-literal JWT_KEY=asdf

In the example command above, the word generic is a type of secret we are wanting to create. Generic here means that we are creating a all-purpose kind of secret information.

The jwt-secret is the name of the Kubernetes Secret object itself. You reference it in your deployment yaml under env to pull the value into the container:

```bash
env:
  - name: JWT_KEY
    valueFrom:
      secretKeyRef:
        name: jwt-secret # the secret object name
        key: JWT_KEY     # the key inside the secret
```

The --from-literal= means you're providing the secret value directly in the command as a plain text key=value pair, rather than reading it from a file.

The jwt=asdf can be stored with additional pairs, but we are assigning a single pair where the key is jwt and the value equals asdf. We will reference the name jwt in our pods.

To see secrets, but not their values, you can run:

kubectl get secrets

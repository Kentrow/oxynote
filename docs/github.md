# GitHub app

Oxynote can watch files in your GitHub repositories. When a watched file
changes, the document that relies on it is flagged, so you know it may be
out of date.

This needs a GitHub App of your own. Setting one up takes about ten
minutes:

1. Create the app on GitHub.
2. Give Oxynote the app's details.
3. Connect your workspace from the app's settings.

The integration is optional. Without it, Oxynote works as usual and only
the GitHub hook is unavailable.

## Before you start

GitHub must be able to reach your Oxynote server. It tells Oxynote about
each installation through a webhook, so `OXYNOTE_PUBLIC_URL` has to be an
address that is reachable from the internet. A `localhost` or LAN address
will not work.

The examples below use `https://oxynote.example.com`. Replace it with your
own public URL.

## Creating the app

GitHub can fill in the app form from a link. Open the one that matches
where the app should live, after replacing `oxynote.example.com` with your
domain.

**For a GitHub organization** (replace `ORGANIZATION` with its name):

```text
https://github.com/organizations/ORGANIZATION/settings/apps/new?name=Oxynote&url=https://oxynote.example.com&setup_url=https://oxynote.example.com/github&webhook_active=true&webhook_url=https://oxynote.example.com/core/api/apps/github/events&public=false&contents=read
```

**For a personal account:**

```text
https://github.com/settings/apps/new?name=Oxynote&url=https://oxynote.example.com&setup_url=https://oxynote.example.com/github&webhook_active=true&webhook_url=https://oxynote.example.com/core/api/apps/github/events&public=false&contents=read
```

The link sets up everything Oxynote needs:

| Setting | Value |
| --- | --- |
| Setup URL | `<OXYNOTE_PUBLIC_URL>/github` |
| Webhook URL | `<OXYNOTE_PUBLIC_URL>/core/api/apps/github/events` |
| Repository permissions | **Contents:** read-only |
| Visibility | private, so only your account can install it |

Oxynote only reads your repositories. It never asks for write access.

Two things are still up to you on the form:

- **The name.** App names are unique across all of GitHub, so `Oxynote`
  is probably taken. Try something like `Oxynote Acme`.
- **The webhook secret.** GitHub can't fill this in from a link. Generate
  one and paste it into the **Webhook secret** field:

  ```sh
  openssl rand -hex 32
  ```

  Keep it, because Oxynote needs the same value.

Then click **Create GitHub App**.

## Collecting the app's details

You need four things from the new app's settings page:

| What | Where to find it |
| --- | --- |
| App ID | the number at the top, next to **App ID** |
| Slug | the last part of the app's public link, `https://github.com/apps/<slug>` |
| Webhook secret | the value you generated above |
| Private key | click **Generate a private key** at the bottom. GitHub downloads a `.pem` file. |

## Configuring Oxynote

### Docker Compose

Add the details to the `oxynote` service in your compose file, and mount
the private key at `/oxynote/github/private-key.pem`:

```yaml
services:
  oxynote:
    environment:
      - OXYNOTE_GITHUB_APP_ID=123456
      - OXYNOTE_GITHUB_APP_SLUG=oxynote-acme
      - OXYNOTE_GITHUB_APP_SIGNATURE_SECRET=<your webhook secret>
    volumes:
      - oxynote_data:/oxynote/data
      - ./github-private-key.pem:/oxynote/github/private-key.pem:ro
```

Restart the container. The three variables and the key go together. If
you set the app ID without the other two variables, or without the key
file, the container refuses to boot.

### Without Compose

Compose is not required. Any way of running the container works, as long
as it sets the three variables and mounts the key at
`/oxynote/github/private-key.pem`. With plain `docker run`:

```sh
docker run -d --name oxynote \
  -p 8080:8080 \
  -e OXYNOTE_GITHUB_APP_ID=123456 \
  -e OXYNOTE_GITHUB_APP_SLUG=oxynote-acme \
  -e OXYNOTE_GITHUB_APP_SIGNATURE_SECRET=<your webhook secret> \
  -v oxynote_data:/oxynote/data \
  -v "$PWD/github-private-key.pem:/oxynote/github/private-key.pem:ro" \
  ghcr.io/oxynote/oxynote:latest
```

To keep the secret out of your shell history, put the variables in a file
and pass `--env-file oxynote.env` instead of the `-e` flags.

## Connecting your workspace

1. In Oxynote, open **Settings**, then **Apps**.
2. Under **GitHub**, click **Activate GitHub Integration**. GitHub opens
   the app's install page.
3. Pick the repositories Oxynote may read, then click **Install**.

GitHub sends you back to Oxynote, which confirms the connection. That's
it.

Install the app as an organization owner. If GitHub turns the install
into a request for an owner to approve, Oxynote can't finish the
connection yet.

Each workspace connects to one GitHub account. You can disconnect it from
the same settings page, or uninstall the app on GitHub.

## Watching files

Open a document and add a **GitHub Commits** hook. Pick a repository, a
branch and the files the document describes. When any of those files
changes, the hook shows how many of them changed, so you know which
documents to review.

Only the repositories you picked during the install show up here. To add
more, change the installation's repository access on GitHub.

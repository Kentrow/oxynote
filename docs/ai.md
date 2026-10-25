# AI assistant and MCP server

Oxynote has two AI features. Both are optional, and the rest of the app
works fine without them.

- **The AI assistant** is a chat inside the app. It reads and edits your
  documents for you.
- **The MCP server** lets outside AI clients, like Claude Code or Claude
  Desktop, use the same tools on your documents.

You can turn on either one without the other. Both run inside the
[production image](../docker/prod/README.md) and are set up with
`OXYNOTE_*` environment variables.

## Setting up the AI assistant

The assistant is off by default. To turn it on, pick a provider, give it
credentials and restart the container.

Here is a minimal setup for Anthropic:

```sh
OXYNOTE_AI_ASSISTANT_PROVIDER=anthropic
OXYNOTE_AI_ASSISTANT_MODEL=claude-opus-4-6
OXYNOTE_AI_ASSISTANT_API_KEY=sk-...
```

The model line is optional. Leave it out and Oxynote picks the provider's
strongest supported model.

Want to switch providers later? Change the variables and restart the
container. That is all it takes.

> [!NOTE]
> The provider variable is the on switch. If you set any other
> `OXYNOTE_AI_ASSISTANT_*` variable without it, the container refuses to
> boot.

### Choosing a provider

Oxynote is not tied to one vendor. Five providers are supported:

| Provider | Credentials | Default model |
| --- | --- | --- |
| `anthropic` | an API key, AWS Bedrock or Google Vertex | `claude-opus-5-5` |
| `openai` | an API key | `gpt-5.1` |
| `google` | an API key | `gemini-2.5-pro` |
| `ollama` | none, but `OXYNOTE_AI_ASSISTANT_BASE_URL` must point to your server | `llama3.3:70b` |
| `openrouter` | an API key | `anthropic/claude-opus-5.5` |

### Picking a model

The assistant does all of its work through tools, against a large
document schema. A model that calls tools badly does not just give weaker
answers. It makes the assistant look broken.

So Oxynote checks your model at boot and puts it in one of three groups:

- **Full strength.** The assistant runs normally.
- **Runs with a warning.** The assistant works, but the log warns you
  about the model's limits.
- **Not supported.** Any model missing from the table below. The
  assistant turns off and logs a warning. The rest of Oxynote still boots.

| Provider | Full strength | Runs with a warning |
| --- | --- | --- |
| `anthropic` | `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-6` | `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-sonnet-4-6` |
| `openai` | `gpt-5.1`, `gpt-5` | `gpt-5-mini` |
| `google` | `gemini-3-pro-preview`, `gemini-2.5-pro` | `gemini-2.5-flash` |
| `ollama` | none | `llama3.3:70b`, `qwen3:32b` |
| `openrouter` | the full-strength models above, with a vendor prefix | the warning models above, with a vendor prefix |

On OpenRouter, a model ID looks like `anthropic/claude-opus-5.5` or
`openai/gpt-5`. OpenRouter writes Claude versions with a dot, not a dash.

### Using an OpenAI-compatible server

Many tools speak the OpenAI chat-completions protocol: local inference
servers, gateways and hosted compatibility layers. To use one, set the
provider to `openai` and point `OXYNOTE_AI_ASSISTANT_BASE_URL` at it.

For Azure OpenAI, also set `OXYNOTE_AI_ASSISTANT_AZURE_API_VERSION`.

### Reaching Claude through AWS Bedrock or Google Vertex

The `anthropic` provider can also reach Claude through your cloud account.

- **AWS Bedrock.** Set `OXYNOTE_AI_ASSISTANT_BEDROCK_REGION`. Leave the
  key variables empty to use the usual AWS credential chain.
- **Google Vertex.** Set `OXYNOTE_AI_ASSISTANT_VERTEX_PROJECT_ID`. Leave
  the service account empty to use application default credentials.

### Where conversations are stored

If `OXYNOTE_VALKEY_DSN` is set, conversations are kept in Valkey.
Otherwise they live in memory, and a restart clears them.

### All assistant variables

| Variable | What it does |
| --- | --- |
| `OXYNOTE_AI_ASSISTANT_PROVIDER` | `anthropic`, `openai`, `google`, `ollama` or `openrouter`. Leave it unset to turn the assistant off. |
| `OXYNOTE_AI_ASSISTANT_MODEL` | A model ID from the table above. Defaults to the provider's default. |
| `OXYNOTE_AI_ASSISTANT_API_KEY` | The vendor's API key. |
| `OXYNOTE_AI_ASSISTANT_BASE_URL` | Overrides the provider's endpoint. Required for `ollama`. |
| `OXYNOTE_AI_ASSISTANT_MAX_TOKENS` | The longest a single reply can be. Default `64000`. |
| `OXYNOTE_AI_ASSISTANT_REQUEST_TIMEOUT` | How long one request to the provider may take, as a Go duration. Default `10m`. |
| `OXYNOTE_AI_ASSISTANT_SUMMARY_MODEL` | The model that summarises long conversations. Pick a cheaper one to save money. Defaults to the main model. |
| `OXYNOTE_AI_ASSISTANT_AZURE_API_VERSION` | Targets Azure OpenAI. `openai` only. |
| `OXYNOTE_AI_ASSISTANT_BEDROCK_REGION`, `_BEDROCK_ACCESS_KEY`, `_BEDROCK_SECRET_ACCESS_KEY`, `_BEDROCK_SESSION_TOKEN` | Reaches Claude through AWS Bedrock. `anthropic` only. |
| `OXYNOTE_AI_ASSISTANT_VERTEX_PROJECT_ID`, `_VERTEX_REGION`, `_VERTEX_SERVICE_ACCOUNT_JSON` | Reaches Claude through Google Vertex. `anthropic` only. |

## Connecting an AI client over MCP

Oxynote is also a remote [MCP](https://modelcontextprotocol.io) server.
Claude Code, Claude Desktop and other MCP clients can read and edit your
documents with the same tools the assistant uses. They can also browse
documents as resources.

The MCP server does not need the assistant. You can use it on its own.

### Before you start

MCP needs a secure address. `OXYNOTE_PUBLIC_URL` must use `https://`, or a
loopback host such as `localhost`. On a plain `http://` LAN address, MCP
stays off.

### Adding Oxynote to Claude Code

1. Add the server, using your own domain:

   ```sh
   claude mcp add --transport http oxynote https://oxynote.example.com/core/api/mcp
   ```

2. In Claude Code, open the `/mcp` menu and pick `oxynote`. Your browser
   opens Oxynote's sign-in page.
3. Approve the client on the consent page.

That is it. Claude Code can now work with your documents.

You can see and revoke connected clients at any time in the app's
settings.

### How access works

- The endpoint is `<OXYNOTE_PUBLIC_URL>/core/api/mcp`, over streamable
  HTTP.
- It is protected by OAuth 2.1. Clients register themselves, and you
  approve each one on a consent page.
- A token works only inside your organization. It carries the
  `documents:read`, `documents:write` and `data-sources:read` scopes.
- Write tools run without asking the server for confirmation. Your client
  is the one that should ask you. Destructive tools are marked as such, so
  the client knows when to ask.

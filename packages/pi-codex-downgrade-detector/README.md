# @mzwing/pi-codex-downgrade-detector

[![npm](https://img.shields.io/npm/v/@mzwing/pi-codex-downgrade-detector)](https://www.npmjs.com/package/@mzwing/pi-codex-downgrade-detector)

Tells you when a [Pi](https://pi.dev) turn was served by a model other than the one you selected.

A substituted turn and a clean turn look identical in the transcript. This reads the model the
server itself named — the `openai-model` response header, or the model field a completions-style
relay echoes back — compares it against what Pi asked for, and keeps one glyph in the footer:

```
· codex   loaded, no turn has finished yet
✓ codex   the server confirmed your model
↓ codex   something cheaper answered
↑ codex   something else answered, still not what you picked
⚠ codex   different models, or the reasoning effort did not match
? codex   nothing named a model, so nothing is confirmed
```

Every extension shares that one footer line and it is truncated to the terminal width, so the
slugs only appear when there is something to say — one row above the editor, which stays until a
later turn comes back clean:

```
↓ codex gpt-6-astra→gpt-5.6-luna (openai-model header)
⚠ codex gpt-6-astra · xhigh→medium (openai-model header)
⚠ codex gpt-6-astra · fallback armed: gpt-5.6-luna (openai-model header)
```

The two slugs are the verdict; the only fragments added after them are the ones an arrow between
slugs cannot express. The trailing note says which signal named the served model, because a
server-stated header and a relay's own echo are not worth the same.

The first time a session sees a substitution it also raises a notification, once per
`requested→served` pair.

Nothing here judges answer quality, and nothing leaves your machine.

## Install

```bash
pi install npm:@mzwing/pi-codex-downgrade-detector
```

## Configuration

Optional. Both scopes are merged, project over global; `tiers` merges key by key.

| Scope   | Path                                                             |
| ------- | ---------------------------------------------------------------- |
| Global  | `~/.pi/agent/extensions/pi-codex-downgrade-detector/config.json` |
| Project | `.pi/extensions/pi-codex-downgrade-detector/config.json`         |

| Field         | Default            | Description                                                                      |
| ------------- | ------------------ | -------------------------------------------------------------------------------- |
| `providers`   | `["openai-codex"]` | Provider ids to watch. `[]` watches every provider.                              |
| `tiers`       | `{}`               | `slug` to integer rank, higher meaning more capable. Extends the built-in table. |
| `checkEffort` | `true`             | Also compare the reasoning effort Pi sent against the level you selected.        |
| `notify`      | `true`             | Raise a notification the first time a pair is substituted.                       |

Rank a slug under `tiers` whenever the footer reports a direction it could not work out — a
brand-new model, or a relay's own house models.

## /codex-downgrade

`/codex-downgrade` prints every turn this session observed, which signal named the served model,
and the codes behind each verdict. `/codex-downgrade show` prints the resolved config and where it
was read from.

| Code                         | Meaning                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `MODEL_MATCH`                | The server named the model you selected.                    |
| `MODEL_SUBSTITUTED`          | A different model, with a direction the arrow shows.        |
| `MODEL_MISMATCH`             | A different model, with no rule to order the two.           |
| `MODEL_VARIANT`              | Your model with a server-side suffix.                       |
| `MODEL_UNRECOGNIZED`         | A slug that does not parse as a model name.                 |
| `VENDOR_MISMATCH`            | One side is an OpenAI model and the other is not.           |
| `BACKEND_FAMILY_MISMATCH`    | The response id belongs to another vendor.                  |
| `SAFETY_BUFFERING_ARMED`     | A faster fallback is loaded but has not fired.              |
| `SAFETY_BUFFERING_APPLIED`   | That fallback is what served the turn.                      |
| `EFFORT_SUBSTITUTED`         | Pi sent an effort other than your level maps to.            |
| `UNVERIFIED`                 | Nothing named a served model.                               |
| `REQUESTED_MODEL_UNRECORDED` | Your model is ranked nowhere, so the verdict reads shape.   |
| `MODEL_UNRECORDED`           | The name matches, but nothing corroborates what it denotes. |

## Limits

The served model is only as good as what the server states. If the provider does not expose the
`openai-model` header and does not echo a model back, the footer shows `?` rather than a tick —
silence is reported as silence, never as a pass.

The effort comparison is client-side. It reports what Pi put on the wire against what your
selected thinking level maps to for that model; nothing on the response side confirms the effort
the server actually used.

## Credits

<https://t.me/c/2502727045/42320>

Super thx for opening the detecting verdict out!

## License

[MIT](LICENSE)

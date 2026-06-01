# Label→entity mapping — Phase A: piighost library

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every label-bearing detector accept `labels` as a list (identity) **or** a `{emitted: model}` dict in the TOML/Python config, and emit the mapped label.

**Architecture:** `gliner2`/`spacy`/`transformers` already remap via `BaseNERDetector` (`labels: list|dict`); we widen their config schema and stop the `list(...)` coercion in `from_config`. `LLMDetector` (not a `BaseNERDetector`) gets its own normalize-and-remap. Then bump the version and publish to PyPI.

**Tech Stack:** Python 3.13, pydantic v2, pytest (+pytest-asyncio), uv, GitHub Actions `release.yml` (publish on tag).

**Spec:** `docs/superpowers/specs/2026-06-02-label-mapping-detectors-design.md` (Partie A).
**Repo:** `/home/secondary/PycharmProjects/piighost` (NOT the website). Work on a branch; `master` is the default.

---

## File Structure
- **Modify** `src/piighost/config/models/detector.py` — widen `labels` to `list[str] | dict[str,str]` on gliner2/spacy/llm; add `labels` to transformers.
- **Modify** `src/piighost/detector/gliner2.py`, `spacy.py`, `transformers.py` — pass `cfg.labels` through (no `list(...)`).
- **Modify** `src/piighost/detector/llm.py` — normalize list|dict, build schema/prompt from internal labels, remap output.
- **Modify** `tests/config/test_models.py`, `tests/detector/test_llm_detector.py` — new tests.
- **Modify** `pyproject.toml`, `CHANGELOG.md`, `uv.lock` — release.

---

## Task 0: Branch

- [ ] **Step 1: Create a feature branch**

```bash
cd /home/secondary/PycharmProjects/piighost
git checkout master && git pull --ff-only
git checkout -b feat/label-mapping
```

---

## Task 1: Config schema accepts list or dict labels

**Files:** Modify `src/piighost/config/models/detector.py`; Test `tests/config/test_models.py`.

- [ ] **Step 1: Write failing tests** — append to `tests/config/test_models.py`:

```python
def test_gliner2_labels_accepts_dict():
    cfg = _DETECTOR_ADAPTER.validate_python(
        {"type": "gliner2", "model": "m", "labels": {"PERSONNE": "person"}}
    )
    assert cfg.labels == {"PERSONNE": "person"}


def test_gliner2_labels_still_accepts_list():
    cfg = _DETECTOR_ADAPTER.validate_python(
        {"type": "gliner2", "model": "m", "labels": ["person"]}
    )
    assert cfg.labels == ["person"]


def test_transformers_labels_optional_and_accepts_dict():
    bare = _DETECTOR_ADAPTER.validate_python({"type": "transformers", "model": "m"})
    assert bare.labels is None
    mapped = _DETECTOR_ADAPTER.validate_python(
        {"type": "transformers", "model": "m", "labels": {"PERSONNE": "PER"}}
    )
    assert mapped.labels == {"PERSONNE": "PER"}


def test_llm_labels_accepts_dict():
    cfg = _DETECTOR_ADAPTER.validate_python(
        {"type": "llm", "provider": "mistral", "model": "m", "labels": {"PERSONNE": "person"}}
    )
    assert cfg.labels == {"PERSONNE": "person"}
```

- [ ] **Step 2: Run, expect FAIL**

Run: `uv run pytest tests/config/test_models.py -k "labels" -q`
Expected: FAIL (dict rejected; transformers has no `labels`).

- [ ] **Step 3: Widen the schema** in `src/piighost/config/models/detector.py`:

Change `Gliner2DetectorConfig.labels`:
```python
    labels: list[str] | dict[str, str] = Field(min_length=1)
```
Change `SpacyDetectorConfig.labels` the same way:
```python
    labels: list[str] | dict[str, str] = Field(min_length=1)
```
In `TransformersDetectorConfig`, add after `threshold`:
```python
    labels: list[str] | dict[str, str] | None = None
```
Change `LLMDetectorConfig.labels`:
```python
    labels: list[str] | dict[str, str] = Field(min_length=1)
```
(`Field(min_length=1)` validates both a non-empty list and a non-empty dict.)

- [ ] **Step 4: Run, expect PASS**

Run: `uv run pytest tests/config/test_models.py -k "labels" -q` → PASS.
Then the whole config suite: `uv run pytest tests/config -q` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/piighost/config/models/detector.py tests/config/test_models.py
git commit -m "feat(config): accept list or {emitted: model} dict for detector labels"
```

---

## Task 2: Builders pass labels through (no list coercion)

**Files:** Modify `src/piighost/detector/gliner2.py`, `spacy.py`, `transformers.py`.

These `from_config` methods load real models (`@pytest.mark.integration` territory), so there is no fast unit test; the schema test (Task 1) plus `BaseNERDetector`'s existing dict handling (`tests/detector/test_base_ner_detector.py`) cover the behavior. Keep the edits minimal.

- [ ] **Step 1: gliner2** — in `src/piighost/detector/gliner2.py` `from_config`, change:
```python
            labels=list(cfg.labels),
```
to:
```python
            labels=cfg.labels,
```

- [ ] **Step 2: spacy** — in `src/piighost/detector/spacy.py` `from_config`, change:
```python
        return cls(model=nlp, labels=list(cfg.labels))
```
to:
```python
        return cls(model=nlp, labels=cfg.labels)
```

- [ ] **Step 3: transformers** — in `src/piighost/detector/transformers.py` `from_config`, change:
```python
        return cls(pipeline=nlp, labels=None, threshold=cfg.threshold)
```
to:
```python
        return cls(pipeline=nlp, labels=cfg.labels, threshold=cfg.threshold)
```

- [ ] **Step 4: Type-check + base/transformers unit tests**

Run:
```bash
uv run pyrefly check src/piighost/detector/gliner2.py src/piighost/detector/spacy.py src/piighost/detector/transformers.py 2>/dev/null || true
uv run pytest tests/detector/test_base_ner_detector.py tests/detector/test_transformers_detector.py -q
```
Expected: the (non-integration) tests pass. (If pyrefly isn't the project's checker, skip it — rely on the test run.)

- [ ] **Step 5: Commit**

```bash
git add src/piighost/detector/gliner2.py src/piighost/detector/spacy.py src/piighost/detector/transformers.py
git commit -m "feat(detector): pass list|dict labels through from_config (no coercion)"
```

---

## Task 3: LLMDetector supports list|dict labels (TDD)

**Files:** Modify `src/piighost/detector/llm.py`; Test `tests/detector/test_llm_detector.py`.

- [ ] **Step 1: Write the failing test** — add to `tests/detector/test_llm_detector.py` (it already defines `_FakeChatModel`, `_entity`, `_extraction`, and the `_patch_langchain_core` fixture; mirror an existing test's markers):

```python
@pytest.mark.asyncio
@pytest.mark.usefixtures("_patch_langchain_core")
async def test_llm_detector_remaps_dict_labels():
    from piighost.detector.llm import LLMDetector

    # The fake LLM returns the INTERNAL label ("person"); the detector must
    # emit the EXTERNAL label ("PERSONNE").
    model = _FakeChatModel(_extraction(_entity("Marie", "person")))
    det = LLMDetector(model=model, labels={"PERSONNE": "person"})
    dets = await det.detect("Marie est ici")
    assert [d.label for d in dets] == ["PERSONNE"]


@pytest.mark.asyncio
@pytest.mark.usefixtures("_patch_langchain_core")
async def test_llm_detector_list_labels_are_identity():
    from piighost.detector.llm import LLMDetector

    model = _FakeChatModel(_extraction(_entity("Marie", "PERSON")))
    det = LLMDetector(model=model, labels=["PERSON"])
    dets = await det.detect("Marie est ici")
    assert [d.label for d in dets] == ["PERSON"]
```
(If the existing tests use a different async style — e.g. an `anyio`/`asyncio` autouse mode — match that file's convention instead of `@pytest.mark.asyncio`.)

- [ ] **Step 2: Run, expect FAIL**

Run: `uv run pytest tests/detector/test_llm_detector.py -k "remaps_dict or identity" -q`
Expected: FAIL (the dict case errors or emits "person", not "PERSONNE").

- [ ] **Step 3: Implement mapping** in `src/piighost/detector/llm.py`.

Add a module-level helper after `_make_schema` (before `class LLMDetector`):
```python
def _normalize_labels(labels: list[str] | dict[str, str]) -> dict[str, str]:
    """Normalize labels into an ``{external: internal}`` mapping (list = identity)."""
    if isinstance(labels, dict):
        return dict(labels)
    return {label: label for label in labels}
```
Replace `__init__`:
```python
    def __init__(
        self,
        model: BaseChatModel,
        labels: list[str] | dict[str, str],
        prompt: str | None = None,
    ) -> None:
        self._label_map = _normalize_labels(labels)  # {external: internal}
        self._reverse = {internal: external for external, internal in self._label_map.items()}
        self._internal = list(self._label_map.values())
        self._prompt = prompt or _DEFAULT_PROMPT
        self._schema = _make_schema(self._internal)
        self._chain = model.with_structured_output(self._schema)
```
In `detect`, change the prompt line:
```python
        system_content = self._prompt.format(labels=", ".join(self._internal))
```
and the Detection label (the LLM emits the internal label; remap to external):
```python
                detections.append(
                    Detection(
                        text=text[start:end],
                        label=self._reverse.get(entity.label.value, entity.label.value),
                        position=Span(start_pos=start, end_pos=end),
                        confidence=1.0,
                    ),
                )
```
In `from_config`, change:
```python
        return cls(model=llm, labels=list(cfg.labels))
```
to:
```python
        return cls(model=llm, labels=cfg.labels)
```
Update the `__init__` docstring `labels:` line to note it accepts a list or `{external: internal}` dict.

- [ ] **Step 4: Run, expect PASS**

Run: `uv run pytest tests/detector/test_llm_detector.py -q` → all pass (existing list-based tests still green; the two new ones pass).

- [ ] **Step 5: Commit**

```bash
git add src/piighost/detector/llm.py tests/detector/test_llm_detector.py
git commit -m "feat(detector): LLMDetector supports {emitted: model} label mapping"
```

---

## Task 4: Version bump, changelog, lock, and release

**Files:** Modify `pyproject.toml`, `CHANGELOG.md`, `uv.lock`.

- [ ] **Step 1: Bump version** — in `pyproject.toml` change `version = "0.12.1"` to `version = "0.13.0"`.

- [ ] **Step 2: Changelog** — in `CHANGELOG.md`, insert above `## 0.12.1 (2026-06-01)`:
```markdown
## 0.13.0 (2026-06-02)

### Feat

- **config/detector**: detector `labels` now accept a `{emitted: model}` mapping
  (not just a list) for `gliner2`, `spacy`, `transformers`, and `llm` — query the
  model with one vocabulary and emit clean labels. `transformers` gains an
  optional `labels` field.

```

- [ ] **Step 3: Update the lockfile**

Run: `uv lock` (updates the project version in `uv.lock`).
Confirm: `grep -A2 'name = "piighost"' uv.lock | head -3` shows `version = "0.13.0"`.

- [ ] **Step 4: Full test suite (non-integration) + lint**

Run:
```bash
uv run pytest -m "not integration" --ignore=tests/test_middleware.py -q
uv run ruff check src/piighost/config/models/detector.py src/piighost/detector/llm.py
```
Expected: tests pass; ruff clean. (The `--ignore` skips a test needing the `langchain` extra absent from the default dev env — unrelated.)

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml CHANGELOG.md uv.lock
git commit -m "release: 0.13.0 — detector label mapping"
```

- [ ] **Step 6: Merge to master, tag, push (triggers PyPI publish via release.yml)**

```bash
git checkout master
git merge --ff-only feat/label-mapping
git tag 0.13.0
git push origin master
git push origin 0.13.0
```
NOTE: pushing the tag triggers `release.yml` (CI → `uv build` → `uv publish` → GitHub Release). If `git push origin master` is rejected because the remote advanced, `git fetch origin && git rebase origin/master` on the feature branch first (re-point the tag afterward), as was done for 0.12.1.

- [ ] **Step 7: Verify the release**

```bash
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
curl -s https://pypi.org/pypi/piighost/json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('latest', j.info.version, '0.13.0?', !!j.releases['0.13.0']);})"
```
Expected: the run succeeds; PyPI shows `0.13.0`.

---

## Self-Review notes
- **Spec coverage (Partie A):** A1 schema → Task 1; A2 builders → Task 2; A3 LLMDetector → Task 3; A4 JSON Schema → covered automatically by the pydantic union (no code, verified implicitly by Task 1's TypeAdapter parse); A5 tests → Tasks 1 & 3 (NER from_config is integration-only, noted); A6 release → Task 4.
- **Type consistency:** `_normalize_labels` returns `{external: internal}`; `_reverse` maps internal→external; matches `BaseNERDetector` semantics used by the other detectors.
- **Phase B (website)** is a separate plan, written after this release so it can pin the exact published version (`0.13.0`).

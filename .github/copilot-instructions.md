# Repository Instructions

## Coding Rules

- Prefer simple, explicit, maintainable code over clever code.
- Separate validation, policy, rate limiting, and business logic into distinct modules.
- Keep functions short and testable.
- Add docstrings to public classes and functions.
- Use strong typing.
- Add comments only where they improve reasoning, not for obvious code.
- Avoid hidden magic and implicit behavior.
- Make every module easy to mock in tests.
- For every major module, include:
  1. what it does
  2. what inputs it expects
  3. what outputs it returns
  4. common failure modes
- Before implementing a module, restate which tests cover it.

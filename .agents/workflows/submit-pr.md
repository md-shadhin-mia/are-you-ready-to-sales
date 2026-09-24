# Name: /submit-pr
# Description: Automates local test verification and pushes a clean pull request.

## Steps:
1. **Branch Verification**: Confirm current git branch matches `ai/*`.
2. **Local Quality Gate**: Execute the local test suite (e.g., `npm run test` or `php artisan test`) depending on the framework.
3. **Commit Code**: If tests pass, stage all modified files and commit with a concise semantic commit message.
4. **Push & PR Generation**: Push the branch to the remote repository.
5. **Draft Pull Request**: Use the `gh` CLI or repository APIs to open a Pull Request against the target branch (e.g., `develop`). Include a clear markdown description summarizing the changes made and tests verified.

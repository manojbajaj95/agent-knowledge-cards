"""Harbor Pi agents pinned to @earendil-works/pi-coding-agent.

Task Dockerfiles bake Node + Pi into the image. install() only verifies ``pi``
and adds a no-op ``~/.nvm/nvm.sh`` shim so stock ``Pi.run`` (which sources nvm)
keeps working without a cold nvm/npm install each trial.

Harbor 0.20.0 stock Pi installs @mariozechner/pi-coding-agent, which stops
at 0.73.x. Pin 0.84.2 (and later) needs @earendil-works/pi-coding-agent.

Import via PYTHONPATH=<repo>/eval and ``-a harbor_pi:PiBare`` /
``-a harbor_pi:PiWithKnowcards``.

For PiWithKnowcards, mount ``eval/harbor/knowcards.tgz`` at
``/opt/knowcards.tgz`` (Docker Compose bind volume JSON).
"""

from __future__ import annotations

from typing import override

from harbor.agents.installed.pi import Pi
from harbor.environments.base import BaseEnvironment


class PiBare(Pi):
    """Pinned Pi from the task image (no knowcards)."""

    @override
    def get_version_command(self) -> str | None:
        return "pi --version"

    @override
    async def install(self, environment: BaseEnvironment) -> None:
        # Image must already provide Node + @earendil-works/pi-coding-agent.
        await self.exec_as_agent(
            environment,
            command=(
                "set -euo pipefail; "
                "command -v pi; "
                "pi --version; "
                # Stock Pi.run sources ~/.nvm/nvm.sh before calling pi.
                "mkdir -p \"$HOME/.nvm\"; "
                "printf '%s\\n' '#!/bin/sh' '# shim: Node/Pi baked into image PATH' "
                "> \"$HOME/.nvm/nvm.sh\""
            ),
        )


class PiWithKnowcards(PiBare):
    """PiBare plus globally installed knowcards from /opt/knowcards.tgz."""

    @override
    async def install(self, environment: BaseEnvironment) -> None:
        await super().install(environment)
        # Root so global npm bin lands on the system PATH (same as baked Pi).
        await self.exec_as_root(
            environment,
            command=(
                "set -euo pipefail; "
                "test -f /opt/knowcards.tgz; "
                "npm install -g --ignore-scripts /opt/knowcards.tgz; "
                "knowcards --version"
            ),
        )

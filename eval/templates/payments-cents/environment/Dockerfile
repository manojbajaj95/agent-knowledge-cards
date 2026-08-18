FROM ubuntu:24.04

WORKDIR /app

# Keep PI_VERSION in sync with eval/run.ts DEFAULT_PI_VERSION.
ARG PI_VERSION=0.84.2
ARG NODE_VERSION=22.19.0
ARG TARGETARCH

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    ca-certificates \
    curl \
    xz-utils \
  && ARCH="$(case "${TARGETARCH}" in amd64) echo x64 ;; arm64) echo arm64 ;; *) echo x64 ;; esac)" \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
  && npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@${PI_VERSION}" \
  && pi --version \
  && rm -rf /var/lib/apt/lists/*

COPY . /app/

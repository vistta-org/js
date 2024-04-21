<div align="center">
  <a href="https://vistta.me">
    <picture>
      <img src="https://git.vistta.me/Vistta/JS/raw/branch/master/logo.png" height="128">
    </picture>
  </a>
  <h1 align="center">Vistta.JS</h1>
</div>

A Nodejs Javascript Component Integration Framework with the objective of simplifying web development.

[Section]: #

# Getting Started

This is a Node.js module available through this gitea instance private npm registry. Node.js and npm are required.

On you project folder create a `.npmrc` file with the following content:

```
@vistta:registry=https://git.vistta.me/api/packages/Vistta/npm/
//git.vistta.me/api/packages/Vistta/npm/:_authToken=<<token>>
```

After that you can install the module

```console
npm i @vistta/js
```

[Section]: #

# Server API

[Section]: #

# Client API

[Section]: #

---

## Authors

- Tiago Almeida ([@TiagoShadow](https://git.vistta.me/Tiago))

## Benchmarks Latest Results (Incognito)

Benchmark #1: 0.0005999999940395355ms (No keys)
Benchmark #2: 0.003199999988079071ms (No keys)
Benchmark #3: 8.399999998509884ms (No keys)
Benchmark #3: 9.872ms (With keys)
Benchmark #4: 0.0493999999165535ms (No keys)

#React Equivalent (Incognito)

Benchmark #1: 4.896000000007451ms (Mandatory keys)
Benchmark #2: 4.793999999672175ms (Mandatory keys)
Benchmark #3: 14.330000000268221ms (Mandatory keys)
Benchmark #4: 21.95400000009127ms (Mandatory keys)

Build Size: 293KB

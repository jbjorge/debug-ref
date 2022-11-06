# @diffx/debug-ref

## Use case

When an application has `ref()`'s that are accessed and modified in different parts of the application, it can be
difficult to track down where the value of a `ref()` is being changed. This package adds the option to log the value
of `ref()`'s in the Vue Devtools browser extension.

## Installation

```bash
npm install @diffx/debug-ref
```

## Usage

Register it during the setup of your Vue app:

```js
import { createApp } from 'vue'
import DebugRefPlugin from '@diffx/debug-ref'

const app = createApp(App)
app.use(DebugRefPlugin)
app.mount('#app')
```

Use it to track a `ref()`:

```js
import { ref } from 'vue'
import { debugRef } from '@diffx/debug-ref'

const sidebarVisible = ref(false)
debugRef('Sidebar visibility', sidebarVisible)
```

Watch the value of the `ref()` in the timeline of the Vue Devtools browser extension:

![Vue Devtools screenshot](https://user-images.githubusercontent.com/1926428/200196713-91dc864c-2a68-472f-a331-962a008d9d86.png)

The `event info` will contain

* the old and new value
* the name of the file where the change happened
* the line number of the change
* the path to the file where the change happened

## Non-development builds

It is _not recommended_ to use this package in production builds. It will add some overhead to your application due to
it keeping track of the changes to the `ref()`'s and inspecting where changes happened.

If the plugin is not registered during startup, the `debugRef()` function will do nothing, but the code will still be
included as part of the build.

```js
import { createApp } from 'vue'
import DebugRefPlugin from '@diffx/debug-ref'

const app = createApp(App)
if (process.env.NODE_ENV === 'development') {
	app.use(DebugRefPlugin)
}
app.mount('#app')
```

## License

[MIT](LICENSE)
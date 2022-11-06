import { DevtoolsPluginApi, ExtractSettingsTypes, PluginSettingsItem, setupDevtoolsPlugin } from '@vue/devtools-api';
import { getCurrentScope, onScopeDispose, Ref, watch } from 'vue';

let _api: DevtoolsPluginApi<ExtractSettingsTypes<Record<string, PluginSettingsItem>>>;
let readId = 'read-ref-layer-id';
let writeId = 'write-ref-layer-id';
let refBuffer: { [key: string]: Ref<any> } = {};

export default {
	install(app: any, options: {}) {
		// @ts-ignore
		Error.stackTraceLimit = Error.stackTraceLimit < 100 ? 100 : Error.stackTraceLimit;
		setupDevtoolsPlugin({
			id: 'tracked-ref-plugin',
			label: 'Ref value trace',
			enableEarlyProxy: true,
			app
		}, api => {
			_api = api;
			api.addTimelineLayer({
				id: readId,
				label: 'Ref read',
				color: 0xff984f
			});
			api.addTimelineLayer({
				id: writeId,
				label: 'Ref modified',
				color: 0x41b86a
			});
			Object.keys(refBuffer).forEach(key => {
				debugRef(key, refBuffer[key]);
			})
			refBuffer = {};
		});
	}
};

export function debugRef(name: string, ref: Ref) {
	if (!_api) {
		refBuffer[name] = ref;
		return;
	}
	let oldValueString: any = null;
	const unwatch = watch(
		() => ref.value,
		(newValue) => {
			const newValueString = newValue == null ? null : JSON.stringify(newValue);
			if (newValueString === oldValueString) {
				return;
			}
			const stackInfo = getStackInfo(new Error());
			if (_api) {
				_api.addTimelineEvent({
					layerId: writeId,
					event: {
						time: _api.now(),
						data: {
							newValue: newValueString == null ? null : JSON.parse(newValueString),
							oldValue: oldValueString == null ? null : JSON.parse(oldValueString),
							file: stackInfo.file,
							line: `${stackInfo.line}:${stackInfo.col}`,
							path: stackInfo.path
						},
						groupId: name,
						title: name,
						subtitle: 'in ' + stackInfo.file
					}
				});
			}
			oldValueString = newValueString;
		},
		{
			onTrack: () => {
				const stackInfo = getStackInfo(new Error());
				_api.addTimelineEvent({
					layerId: readId,
					event: {
						time: _api.now(),
						data: stackInfo,
						groupId: name,
						title: name,
						subtitle: 'in ' + stackInfo.file
					}
				});
			},
			deep: true,
			flush: 'sync',
			immediate: true
		});

	if (getCurrentScope()) {
		onScopeDispose(() => {
			unwatch();
		});
	}
}

function getStackInfo(err: Error) {
	const stack = err.stack || '';
	const lines = stack.split('\n');
	let line = lines.find(l => l.includes('.vue'))
		|| (lines.find(l => l.includes(window.location.origin) && !l.includes('tracked-ref.ts') && !l.includes('node_modules')))
		|| '';
	line = line.substring(line.indexOf(window.location.origin) + window.location.origin.length);
	let filePath = (line.split('?') || [])[0];
	let fileName = filePath.split('/').at(-1);
	let [lineNumber, colNumber] = line
		.replace(/\)/g, '')
		.split(':').slice(1);
	return { file: fileName, line: lineNumber, col: colNumber, path: filePath };
}

export function jsonClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}
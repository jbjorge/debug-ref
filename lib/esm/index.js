import { setupDevtoolsPlugin } from '@vue/devtools-api';
import { getCurrentScope, onScopeDispose, watch } from 'vue';
let _api;
let readId = 'read-ref-layer-id';
let writeId = 'write-ref-layer-id';
let refBuffer = {};
export default {
    install(app, options) {
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
            });
            refBuffer = {};
        });
    }
};
export function debugRef(name, ref) {
    if (!_api) {
        refBuffer[name] = ref;
        return;
    }
    let oldValueString;
    const unwatch = watch(() => ref.value, (newValue) => {
        const newValueString = JSON.stringify(newValue);
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
                        newValue: JSON.parse(newValueString),
                        oldValue: JSON.parse(oldValueString),
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
        oldValueString = JSON.stringify(newValue);
    }, {
        onTrack: (a) => {
            const stackInfo = getStackInfo(new Error());
            if (_api) {
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
            }
        },
        onTrigger: e => console.log(e),
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
function getStackInfo(err) {
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
export function jsonClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

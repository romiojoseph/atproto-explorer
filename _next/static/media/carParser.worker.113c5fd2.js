import { convertCarBytesToJson } from '../../utils/carUtils';

const safeJsonStringify = (value) => JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item)
);

self.onmessage = async (event) => {
    const { type, carBuffer } = event.data || {};
    if (type !== 'parse-car' || !carBuffer) return;

    try {
        const records = await convertCarBytesToJson(new Uint8Array(carBuffer), (progress) => {
            self.postMessage({
                type: 'progress',
                progress
            });
        }, {
            // Worker is already off-main-thread; no need to yield frequently.
            yieldEveryBlocks: 0
        });

        // Keep expensive JSON size estimation off the UI thread.
        const jsonSize = new Blob([safeJsonStringify(records)]).size;

        self.postMessage({
            type: 'done',
            records,
            jsonSize
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error?.message || 'Failed to parse CAR data.'
        });
    }
};

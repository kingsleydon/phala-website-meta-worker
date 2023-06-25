/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const PHALA_PARA_ID = 2035;
const KHALA_PARA_ID = 2004;
const PHALA_METADATA_ENDPOINT = 'https://phala.webapi.subscan.io/api/scan/metadata';
const KHALA_METADATA_ENDPOINT = 'https://khala.webapi.subscan.io/api/scan/metadata';
const POLKADOT_META_ENDPOINT = 'https://polkadot.webapi.subscan.io/api/scan/xcm/meta';
const KUSAMA_META_ENDPOINT = 'https://kusama.webapi.subscan.io/api/scan/xcm/meta';
const PHALA_SQUID_ENDPOINT = 'https://squid.subsquid.io/phala-computation-lite/graphql';
const KHALA_SQUID_ENDPOINT = 'https://squid.subsquid.io/khala-computation-lite/graphql';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

interface Meta {
	data: { send_xcm_message_count: number; received_xcm_message_count: number };
}

interface Metadata {
	data: { count_signed_extrinsic: string };
}

interface SquidData {
	data: { globalStateById: { idleWorkerPInstant: number } };
}

const squidQuery = JSON.stringify({ query: `query {globalStateById(id: "0"){idleWorkerPInstant}}` });

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const fetchMeta = async (endpoint: string, paraId: number) =>
			fetch(endpoint, { method: 'POST', body: JSON.stringify({ para_id: paraId }), headers: { 'content-type': 'application/json' } }).then(
				(res) => res.json()
			) as Promise<Meta>;
		const fetchMetadata = async (endpoint: string) => fetch(endpoint, { method: 'POST' }).then((res) => res.json()) as Promise<Metadata>;
		const fetchSquid = async (endpoint: string) =>
			fetch(endpoint, { method: 'POST', body: squidQuery, headers: { 'content-type': 'application/json' } }).then((res) =>
				res.json()
			) as Promise<SquidData>;
		const [phalaMeta, khalaMeta, phalaMetadata, khalaMetadata, phalaSquid, khalaSquid] = await Promise.all([
			fetchMeta(POLKADOT_META_ENDPOINT, PHALA_PARA_ID),
			fetchMeta(KUSAMA_META_ENDPOINT, KHALA_PARA_ID),
			fetchMetadata(PHALA_METADATA_ENDPOINT),
			fetchMetadata(KHALA_METADATA_ENDPOINT),
			fetchSquid(PHALA_SQUID_ENDPOINT),
			fetchSquid(KHALA_SQUID_ENDPOINT),
		]);

		const json = {
			phalaSendXcmMessageCount: phalaMeta.data.send_xcm_message_count,
			phalaReceivedXcmMessageCount: phalaMeta.data.received_xcm_message_count,
			phalaSignedExtrinsicCount: phalaMetadata.data.count_signed_extrinsic,
			phalaPInstant: phalaSquid.data.globalStateById.idleWorkerPInstant,
			khalaSendXcmMessageCount: khalaMeta.data.send_xcm_message_count,
			khalaReceivedXcmMessageCount: khalaMeta.data.received_xcm_message_count,
			khalaSignedExtrinsicCount: khalaMetadata.data.count_signed_extrinsic,
			khalaPInstant: khalaSquid.data.globalStateById.idleWorkerPInstant,
		};

		return new Response(JSON.stringify(json), {
			headers: { 'content-type': 'application/json;charset=UTF-8' },
		});
	},
};

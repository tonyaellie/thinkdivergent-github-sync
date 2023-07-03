/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

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

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return new Response('Hello World!');
		/*
    overview of how this will work:
		- currently will configure blueprint and root node (root node being the root of github projects) in env variables, find a way to make this more dynamic
		- use cron to run this worker every x minutes (5 minutes?)
		- worker will fetch all direct descendants of root node and check if they have a linked github repo
		- if they do, it will get all the descendancts of that node and check if they have a linked github issue
		- if they do, get descendants and sync with description and sync title? (not sure about this due to large number of characters in title)
		- if they don't, create a new issue with the title of the node and the description of the descendants
		- check the issues to see if there are any that are not linked to a node and create a new node with the title of the issue
		**/
	},
};

import { Octokit } from '@octokit/rest';
import { z } from 'zod';
import data from '../../data.json'; // TODO: replace with pulling from the API

const octokit = new Octokit({
	auth: 'placeholder', // TODO: replace with actual auth
	userAgent: 'thinkdivergentsync v0.0.1',
});

const BlueprintSchema = z.object({
	name: z.string(),
	id: z.number(),
	user_id: z.string(),
	root_id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	is_public: z.boolean(),
	is_temporary: z.boolean(),
	revisions: z.array(
		z.object({
			data: z.object({
				base_rev: z.nullable(z.number()).optional(),
				user_id: z.nullable(z.string()).optional(),
				operations: z.array(
					z.discriminatedUnion('type', [
						z.object({
							type: z.literal('AT'), // Add Task
							user_id: z.nullable(z.string()).optional(),
							args: z
								.array(
									z.union([
										z.object({
											blocked_until: z.nullable(z.number()),
											completed: z.boolean(),
											created_at: z.number(),
											external_id: z.nullable(z.string()),
											idx_at_create: z.number(),
											name: z.string(),
											owner: z.nullable(z.unknown()),
											task_id: z.string(),
										}),
										z.object({
											name: z.string(),
											task_id: z.string(),
										}),
									])
								)
								.length(1),
						}),
						z.object({
							type: z.literal('UT'), // Update Task
							user_id: z.nullable(z.string()),
							args: z
								.array(
									z.object({
										blocked_until: z.nullable(z.number()),
										completed: z.nullable(z.boolean()),
										created_at: z.nullable(z.number()),
										external_id: z.nullable(z.string()),
										href: z.optional(z.string()), // not necessarily a url
										idx_at_create: z.number().optional(),
										name: z.string(),
										owner: z.nullable(z.unknown()),
										task_id: z.string(),
									})
								)
								.length(1),
						}),
						z.object({
							type: z.literal('DT'), // Delete Task
							user_id: z.nullable(z.string()),
							args: z.array(z.string()).length(1),
						}),
						z.object({
							type: z.literal('ASE'), // Add Subtask Edge
							user_id: z.nullable(z.string()),
							args: z.array(z.string()).length(2),
						}),
						z.object({
							type: z.literal('DSE'), // Delete Subtask Edge
							user_id: z.nullable(z.string()),
							args: z.array(z.string()).length(2),
						}),
						z.object({
							type: z.literal('ANE'), // Add Next Task Edge
							user_id: z.nullable(z.string()),
							args: z.array(z.string()).length(2),
						}),
						z.object({
							type: z.literal('DNE'), // Delete Next Task Edge
							user_id: z.nullable(z.string()),
							args: z.array(z.string()).length(2),
						}),
						z.object({
							type: z.literal('US'), // Update Status
							user_id: z.nullable(z.string()),
							args: z
								.array(
									z.object({
										blocked_until: z.number(),
										owner: z.string(),
										task_id: z.string(),
									})
								)
								.length(1),
						}),
					])
				),
			}),
			r: z.number(),
		})
	),
});

const blueprint = BlueprintSchema.parse(data);

// find nodes with a href that equals https://github.com(/)
// make sure not been deleted
// find children and check if link is to a github repo, check if perms to it
// do the things

const getNodesWithGithubLinks = (blueprint: z.infer<typeof BlueprintSchema>) => {
	const nodes: {
		task_id: string;
		href: string;
	}[] = [];

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'UT') {
				const task = operation.args[0];
				if (task?.href && task.href === 'https://github.com') {
					console.log(task.href);
					nodes.push({
						task_id: task.task_id,
						href: task.href,
					});
				}
			}
		});
	});

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'DT') {
				const task_id = operation.args[0];
				const index = nodes.findIndex((node) => node.task_id === task_id);
				if (index !== -1) {
					nodes.splice(index, 1);
				}
			}
		});
	});

	return nodes;
};

const getNodeById = (blueprint: z.infer<typeof BlueprintSchema>, task_id: string) => {
	let node: {
		task_id: string;
		href?: string;
	} | null = null;

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'AT') {
				const task = operation.args[0];
				if (task?.task_id && task.task_id === task_id) {
					node = {
						task_id: task.task_id,
					};
				}
			}
		});
	});

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'UT') {
				const task = operation.args[0];
				if (task?.task_id && task.task_id === task_id) {
					node = {
						task_id: task.task_id,
						href: task.href,
					};
				}
			}
		});
	});

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'DT') {
				if (operation.args.includes(task_id)) {
					node = null;
				}
			}
		});
	});

	return node;
};

// get all child nodes of a node
const getChildNodes = (blueprint: z.infer<typeof BlueprintSchema>, task_id: string) => {
	const nodes: {
		task_id: string;
		href?: string;
	}[] = [];

	blueprint.revisions.forEach((revision) => {
		revision.data.operations.forEach((operation) => {
			if (operation.type === 'ASE') {
				const [parent, child] = operation.args;
				if (parent === task_id && child) {
					console.log('child', child);
					const node = getNodeById(blueprint, child);
					if (node) {
						nodes.push(node);
					}
				}
			}
		});
	});

	return nodes;
};

const githubLinkNodes = getNodesWithGithubLinks(blueprint);

githubLinkNodes.forEach((node) => {
	console.log(node);
	const children = getChildNodes(blueprint, node.task_id);
	children.forEach((child) => {
		console.log(child);
		// check if link is in format https://github.com/owner/repo
		// if so check if user has perms to repo
		// filter out children that are not github links and do not have perms

		const filteredChildren = children.filter((child) => {
			if (child.href) {
				if (
					child.href.replace('https://', '').split('/').length === 3 &&
					child.href.replace('https://', '').split('/')[0] === 'github.com'
				) {
					// check if user has perms to repo
					return true;
				}
			}
			return false;
		});
	});
});

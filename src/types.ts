declare module 'express-session' {
	interface SessionData {
		redirectTo: string | null;
		user: User | null;
		input: Record<string, unknown> | null;
		errors: Record<string, unknown> | null;
		searchCount: number;
		cumulativeDelay: number;
	}
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			user: User | null;
			apiKeyPayload: ApiKeyPayload | null;
		}
	}
}

export type ApiKeyPayload = { userId: number; apiKeyVersion: number };

export type Env = 'production' | 'development' | 'testing';

export type GitHubOauthToken = { access_token: string };

export interface Api {
	generate: (payload: ApiKeyPayload) => Promise<string>;
	verify: (apiKey: string) => Promise<ApiKeyPayload | null>;
}

export type CronJob = {
	expression: string;
	callback: () => void;
};

export type Carrier = {
  name: string;
  emails: string[];
}

export type CarrierData = {
  [key: string]: Carrier[];
}

export type User = {
	id: number;
	username: string;
	email: string;
	is_admin: boolean;
	created_at: string;
	updated_at: string;
};

export interface GitHubUser {
	login: string;
	avatar_url: string;
	name: string;
	email: string;
}

export type GithubUserEmail = {
	email: string;
	primary: boolean;
	verified: boolean;
	visibility: string | null;
};

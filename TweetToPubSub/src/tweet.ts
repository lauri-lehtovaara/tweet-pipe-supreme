/*
{
    "data": {
	"id": "1493323687235309575",
	"text": "Harnessing machine learning to improve site safety  #ConstrcutionSite\n\nhttps://t.co/EJRvy6dKZF https://t.co/QPTCm3O4ny"
    },
    "matching_rules": [
	{ "id": "1493320906319572993",
	  "tag": "machine learning with images"
	}
    ]
}
*/

export class Tweet {
    public id: string;
    public text: string;
    public timestamp: string;
    public author: string;

    static fromTwitterJson(json: any) : Tweet {
        // FIXME: add validation
        const { data } = json;
        const { id, text, created_at, author_id } = data;
        return { id, text, timestamp: created_at, author: author_id };
    }

    static toJson(tweet: Tweet) {
        return JSON.stringify(tweet)
    }
}

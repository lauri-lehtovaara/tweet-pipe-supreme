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

    static fromTwitterJson(json: any) : Tweet {
	const { data } = json;
	const { id, text } = data;
	return { id, text };
    }

    static toJson(tweet: Tweet) {
	const { id, text } = tweet;

	return JSON.stringify({
	    id,
	    text
	});
    }
}

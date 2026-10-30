import json
import unittest
from evidence import sanitize_har, summarize


class EvidenceTest(unittest.TestCase):
    def test_sanitize_strips_secrets(self):
        entry = {'startedDateTime': '2026-10-30T13:00:00Z', 'time': 5600,
                 'request': {'method': 'POST', 'url': 'https://example.test/api/v1/admin/upload-sessions/11111111-1111-1111-1111-111111111111/media?token=SECRET',
                             'headers': [{'name': 'Cookie', 'value': 'SECRET'}], 'postData': {'text': 'SECRET'}},
                 'response': {'status': 201, 'headers': [{'name': 'Set-Cookie', 'value': 'SECRET'}],
                              'bodySize': 100, 'content': {'text': 'SECRET', 'size': 90}},
                 'timings': {'send': 12, 'wait': 5560, 'receive': 28}, '_secret': 'SECRET'}
        data = sanitize_har({'log': {'entries': [entry, {
            'request': {'url': 'https://res.cloudinary.com/private/SECRET', 'method': 'GET'},
            'response': {'status': 200}}]}})
        encoded = json.dumps(data)
        self.assertNotIn('SECRET', encoded)
        self.assertNotIn('11111111', encoded)
        self.assertEqual(len(data['log']['entries']), 1)
        clean = data['log']['entries'][0]
        self.assertEqual(clean['request']['url'], '/api/v1/admin/upload-sessions/:session/media')
        self.assertEqual(clean['response']['status'], 201)
        self.assertEqual(clean['timings']['wait'], 5560)
        self.assertEqual(clean['timings']['connect'], -1)

    def test_summary_preserves_workloads_and_cold(self):
        records = [{'environment': 'local', 'revision': 'abc', 'workload': 2, 'warmState': 'warm',
                    'group': 'publish', 'durationMs': n} for n in [1, 2, 3, 4, 100]]
        records += [dict(records[0], warmState='cold', durationMs=1000),
                    dict(records[0], workload=6, durationMs=50)]
        result = summarize(records)
        warm = next(r for r in result['groups'] if r['warmState'] == 'warm' and r['workload'] == 2)
        self.assertEqual((warm['count'], warm['medianMs'], warm['minMs'], warm['maxMs']), (5, 3, 1, 100))
        self.assertNotIn('p95', json.dumps(result))
        self.assertEqual(len(result['groups']), 3)

    def test_keeps_only_allowlisted_media_variant_metadata(self):
        source = {'log': {'entries': [{'request': {'method': 'GET', 'url': 'https://example/api/v1/admin/books/1/media/FRONT/content?size=320&format=jpg&v=SECRET'}, 'response': {'status': 200}}]}}
        clean = sanitize_har(source)
        self.assertEqual(clean['log']['entries'][0]['request']['mediaVariant'], {'size': 320, 'format': 'jpg'})
        self.assertNotIn('SECRET', json.dumps(clean))

    def test_unknown_values_are_not_zero_or_secret(self):
        clean = sanitize_har({'log': {'entries': [{'time': 'SECRET', 'startedDateTime': 'SECRET',
            'request': {'method': 'SECRET', 'url': 'https://x/api/v1/admin/books/42/media/FRONT/content?secret=SECRET'},
            'response': {'status': 200}, 'timings': {'wait': 'SECRET'}}]}})
        self.assertNotIn('SECRET', json.dumps(clean))
        self.assertEqual(clean['log']['entries'][0]['timings']['wait'], -1)


if __name__ == '__main__':
    unittest.main()

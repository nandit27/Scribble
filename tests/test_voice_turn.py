import unittest
from fastapi.testclient import TestClient
from services.main import app, TOOL_SECRET


class VoiceTurnIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.session = self.client.post('/api/v1/sessions').json()['session_id']
        response = self.client.post(f'/api/v1/sessions/{self.session}/context', json={'problem_text': 'Consider f(x) = x**2.'})
        self.assertEqual(response.status_code, 201)
        self.headers = {'X-Scribble-Tool-Secret': TOOL_SECRET} if TOOL_SECRET else {}

    def test_voice_graph_is_persisted_for_workspace(self):
        response = self.client.post('/api/v1/tools/tutor-turn', headers=self.headers, json={
            'scribble_session_id': self.session,
            'question': 'Graph x squared and explain why it is not one to one',
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['clarification_required'])
        turns = self.client.get(f'/api/v1/sessions/{self.session}/turns').json()['turns']
        self.assertEqual(turns[0]['turn_id'], response.json()['turn_id'])
        self.assertEqual(turns[0]['artifact']['type'], 'graph')
        self.assertEqual(turns[0]['artifact']['graph']['expression'], 'x**2')
        self.assertGreater(len(turns[0]['artifact']['graph']['points']), 100)

    def test_invalid_expression_asks_for_clarification(self):
        response = self.client.post('/api/v1/tools/tutor-turn', headers=self.headers, json={
            'scribble_session_id': self.session, 'question': 'Graph this', 'expression': 'invalid expression',
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['clarification_required'])
        self.assertIn('No artifact', response.json()['artifact_summary'])


if __name__ == '__main__':
    unittest.main()

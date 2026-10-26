import unittest
from prepare_render_env import render_settings

class RenderSettingsTest(unittest.TestCase):
    def test_decodes_credentials_and_keeps_secrets_out_of_jdbc_urls(self):
        settings = render_settings({'NEON_DATABASE_URL':'postgresql://user:p%40ss@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'})
        self.assertEqual(settings['NEON_DB_PASSWORD'], 'p@ss')
        self.assertEqual(settings['NEON_DB_USER'], 'user')
        self.assertIn('ep-test-pooler.', settings['NEON_JDBC_URL'])
        self.assertIn('ep-test.us-east-2.aws.neon.tech', settings['NEON_JDBC_URL_UNPOOLED'])
        self.assertIn('sslmode=verify-full', settings['NEON_JDBC_URL'])
        self.assertNotIn('p%40ss', settings['NEON_JDBC_URL'])
        self.assertEqual(settings['CLOUDINARY_NAMESPACE'], 'memay/online-test')
        self.assertEqual(settings['BOOTSTRAP_OWNER_ENABLED'], 'false')
    def test_rejects_non_neon_or_different_database_direct_url(self):
        for raw in ['postgresql://user:pass@localhost/dev', 'postgresql://user:pass@example.com/db', 'not-a-url']:
            with self.assertRaises(ValueError): render_settings({'NEON_DATABASE_URL':raw})
        with self.assertRaises(ValueError):
            render_settings({'NEON_DATABASE_URL':'postgresql://u:p@ep-test-pooler.us-east-2.aws.neon.tech/db?sslmode=require','NEON_DATABASE_URL_UNPOOLED':'postgresql://u:p@ep-other.us-east-2.aws.neon.tech/db?sslmode=require'})
    def test_never_carries_local_database_or_profile_into_render(self):
        source={'NEON_DATABASE_URL':'postgresql://u:p@ep-test-pooler.us-east-2.aws.neon.tech/db?sslmode=require','DB_URL':'local','TEST_DB_URL':'test','SPRING_PROFILES_ACTIVE':'local'}
        result=render_settings(source)
        self.assertNotIn('DB_URL',result);self.assertNotIn('TEST_DB_URL',result)
        self.assertEqual(result['SPRING_PROFILES_ACTIVE'],'render')
        self.assertEqual(source['SPRING_PROFILES_ACTIVE'],'local')
if __name__=='__main__':unittest.main()

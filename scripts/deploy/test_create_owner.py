import unittest
from create_owner import owner_environment
from prepare_render_env import read_env
from pathlib import Path
from tempfile import TemporaryDirectory

class OwnerEnvironmentTest(unittest.TestCase):
    def test_preserves_literal_hash_in_the_chosen_password(self):
        with TemporaryDirectory() as directory:
            path=Path(directory)/'settings.env'
            path.write_text("OWNER_PASSWORD=fixed#owner-password-123\nOWNER_EMAIL=chosen@example.com # operator's comment\nOTHER=\"literal # inside\" # another's comment\n# full comment\n")
            values=read_env(path)
            self.assertEqual(values['OWNER_PASSWORD'],'fixed#owner-password-123')
            self.assertEqual(values['OWNER_EMAIL'],'chosen@example.com')
            self.assertEqual(values['OTHER'],'literal # inside')
    def test_neon_uses_direct_connection_and_only_explicit_owner_credentials(self):
        source={'NEON_DATABASE_URL':'postgresql://u:p@ep-test-pooler.us-east-2.aws.neon.tech/db?sslmode=require', 'OWNER_EMAIL':'chosen@example.com','OWNER_PASSWORD':'fixed-owner-password-123','BOOTSTRAP_OWNER_EMAIL':'legacy@example.com'}
        result=owner_environment(source,'neon')
        self.assertNotIn('-pooler.',result['OWNER_JDBC_URL'])
        self.assertEqual(result['OWNER_EMAIL'],'chosen@example.com')
        self.assertEqual(result['OWNER_PASSWORD'],'fixed-owner-password-123')
        self.assertNotIn('BOOTSTRAP_OWNER_EMAIL',result)
    def test_missing_owner_inputs_never_fall_back_to_legacy_bootstrap(self):
        with self.assertRaises(ValueError): owner_environment({'BOOTSTRAP_OWNER_EMAIL':'legacy@example.com','BOOTSTRAP_OWNER_PASSWORD':'old-password'},'neon')
    def test_local_target_is_explicit_and_restricted_to_project_dev_database(self):
        source={'OWNER_EMAIL':'chosen@example.com','OWNER_PASSWORD':'fixed-owner-password-123','DB_URL':'jdbc:postgresql://localhost:5432/me_may_dev','DB_USER':'u','DB_PASSWORD':'p'}
        self.assertEqual(owner_environment(source,'local')['OWNER_JDBC_URL'],source['DB_URL'])
        for value in ['jdbc:postgresql://localhost:5432/other_db','jdbc:postgresql://example.com/me_may_dev','jdbc:postgresql://localhost:5432/me_may_dev?currentSchema=other']:
            with self.assertRaises(ValueError):owner_environment({**source,'DB_URL':value},'local')
if __name__=='__main__':unittest.main()

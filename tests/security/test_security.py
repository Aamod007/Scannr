from tests.security.vapt import run_vapt_scan, check_encryption_at_rest, check_tls13
from tests.security.penetration import test_blockchain_fraud as blockchain_fraud, test_unauthenticated_access as unauth_access


def test_vapt_scan():
    result = run_vapt_scan()
    assert result["score"] == "A+"


def test_encryption():
    result = check_encryption_at_rest()
    assert result["postgresql"] is True
    assert result["s3"] is True
    assert result["fabric"] is True


def test_tls13():
    result = check_tls13()
    assert result["all_endpoints"] is True


def test_blockchain_fraud():
    result = blockchain_fraud()
    assert result["backdate_attempt"] is False
    assert result["delete_violation_attempt"] is False


def test_unauth_access():
    result = unauth_access()
    assert result["unauth_api_call"] == 401
    assert result["mTLS_enforced"] is True
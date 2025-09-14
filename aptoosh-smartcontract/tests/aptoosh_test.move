module aptoosh::aptoosh_test {

    #[test_only]
    use aptoosh::market;

    #[test(account = @aptoosh)]
    fun init_ok(account: &signer) {
        market::init_escrow(account, b"seed");
        market::init_products(account);
        market::init_orders(account);
    }
}

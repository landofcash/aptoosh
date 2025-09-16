module aptoosh::aptoosh_test {

    #[test_only]
    use aptoosh::aptoosh;
    use aptoosh::products;
    use std::string;
    use std::option;

    #[test(account = @aptoosh)]
    fun init_ok(account: &signer) {
        aptoosh::init_escrow(account, b"seed");
        aptoosh::init_products(account);
        aptoosh::init_orders(account);
    }

    #[test(account = @aptoosh)]
    fun create_product_ok(account: &signer) {
        // Initialize the products store for this fresh test context
        aptoosh::init_products(account);

        let seed = b"1111222233334444555567"; // 22 bytes
        let url = string::utf8(b"https://example.com/product");

        // Create the product
        aptoosh::create_product(account, copy seed, url);

        // Verify the product exists
        let got = products::get_product(copy seed);
        assert!(got.is_some(), 100);
    }
}


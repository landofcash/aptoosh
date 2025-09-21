module aptoosh::aptoosh {
    use std::string;

    use aptoosh::orders;
    use aptoosh::products;
    use aptoosh::escrow;

    // ---- Escrow wrappers ----
    public entry fun init_escrow(admin: &signer, seed: vector<u8>) { escrow::init_escrow(admin, seed); }

    public entry fun register_escrow_coin<CoinType>(admin: &signer) { escrow::register_escrow_coin<CoinType>(admin); }

    // ---- Products wrappers ----
    public entry fun init_products(publisher: &signer) { products::init_products(publisher); }

    public entry fun create_product(shop: &signer, seed: vector<u8>, seller_pubkey:vector<u8>, url: string::String) {
        products::create_product(
            shop,
            seed,
            seller_pubkey,
            url
        );
    }

    public entry fun update_product(
        shop: &signer,
        seed: vector<u8>,
        new_url: string::String
    ) { products::update_product(shop, seed, new_url); }

    public entry fun delete_product(shop: &signer, seed: vector<u8>) { products::delete_product(shop, seed); }

    // ---- Orders wrappers ----
    public entry fun init_orders(publisher: &signer) { orders::init_orders(publisher); }

    public entry fun create_order_initial<CoinType>(
        buyer: &signer,
        seed: vector<u8>,
        product_seed: vector<u8>,
        seller: address,
        price_amount: u64,
        buyer_pubkey: vector<u8>,
        seller_pubkey: vector<u8>,
        enc_key_buyer: vector<u8>,
        enc_key_seller: vector<u8>,
        sym_key_hash: vector<u8>,
        payload_hash_buyer: vector<u8>,
        buyer_encrypted: vector<u8>
    ) {
        orders::create_order_initial<CoinType>(
            buyer, seed, product_seed, seller, price_amount,
            buyer_pubkey, seller_pubkey, enc_key_buyer, enc_key_seller,
            sym_key_hash, payload_hash_buyer, buyer_encrypted
        );
    }

    public entry fun create_order_paid<CoinType>(
        buyer: &signer,
        seed: vector<u8>,
        product_seed: vector<u8>,
        seller: address,
        buyer_pubkey: vector<u8>,
        seller_pubkey: vector<u8>,
        enc_key_buyer: vector<u8>,
        enc_key_seller: vector<u8>,
        sym_key_hash: vector<u8>,
        payload_hash_buyer: vector<u8>,
        buyer_encrypted: vector<u8>,
        amount: u64
    ) {
        orders::create_order_paid<CoinType>(
            buyer, seed, product_seed, seller,
            buyer_pubkey, seller_pubkey, enc_key_buyer, enc_key_seller,
            sym_key_hash, payload_hash_buyer, buyer_encrypted,
            amount
        );
    }

    public entry fun buy_order<CoinType>(
        payer: &signer,
        seed: vector<u8>,
        amount: u64
    ) { orders::buy_order<CoinType>(payer, seed, amount); }

    public entry fun start_delivering(
        seller_signer: &signer,
        seed: vector<u8>,
        payload_hash_seller: vector<u8>,
        seller_encrypted: vector<u8>
    ) { orders::start_delivering(seller_signer, seed, payload_hash_seller, seller_encrypted); }

    public entry fun confirm_order<CoinType>(buyer_signer: &signer, seed: vector<u8>) {
        orders::confirm_order<CoinType>(
            buyer_signer,
            seed
        );
    }

    public entry fun require_refund(buyer_signer: &signer, seed: vector<u8>) {
        orders::require_refund(
            buyer_signer,
            seed
        );
    }

    public entry fun process_refund_to_buyer<CoinType>(
        admin: &signer,
        seed: vector<u8>
    ) { orders::process_refund_to_buyer<CoinType>(admin, seed); }

    public entry fun process_refund_to_seller<CoinType>(
        admin: &signer,
        seed: vector<u8>
    ) { orders::process_refund_to_seller<CoinType>(admin, seed); }

    public entry fun check_timeouts<CoinType>(_caller: &signer, seed: vector<u8>) {
        orders::check_timeouts<CoinType>(
            _caller,
            seed
        );
    }

    public entry fun set_addr_chunk(actor: &signer, seed: vector<u8>, chunk_idx: u32, chunk: vector<u8>) {
        orders::set_addr_chunk(actor, seed, chunk_idx, chunk);
    }

    public entry fun delete_order(caller: &signer, seed: vector<u8>) { orders::delete_order(caller, seed); }
}

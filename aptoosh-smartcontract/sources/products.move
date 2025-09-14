module aptoosh::products {
    use std::signer;
    use std::string;
    use aptos_std::table;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    friend aptoosh::market;

    // Inline constants used by products module
    const SEED_LEN: u64 = 22;

    const E_NOT_OWNER: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_BAD_SEED: u64 = 3;
    const E_EXISTS: u64 = 4;
    const E_NOT_FOUND: u64 = 5;
    const E_NOT_ADMIN: u64 = 8;

    struct Product has store, drop {
        version: u8,
        shop: address,
        products_url: string::String,
    }

    #[event]
    struct ProductCreated has store, drop { seed: vector<u8>, shop: address, ts: u64 }

    #[event]
    struct ProductUpdated has store, drop { seed: vector<u8>, ts: u64 }

    #[event]
    struct ProductDeleted has store, drop { seed: vector<u8>, ts: u64 }

    struct Products has key {
        products: table::Table<vector<u8>, Product>,
    }

    /// One-time init for the products store (only @aptoosh).
    public(friend) fun init_products(publisher: &signer) {
        assert!(signer::address_of(publisher) == @aptoosh, E_NOT_ADMIN);
        assert!(!exists<Products>(@aptoosh), E_ALREADY_INITIALIZED);
        move_to<Products>(publisher, Products { products: table::new<vector<u8>, Product>() });
    }

    /// Create Product
    public(friend) fun create_product(
        shop: &signer,
        seed: vector<u8>,
        url: string::String
    ) acquires Products {
        assert!(seed.length() == SEED_LEN, E_BAD_SEED);
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(!store.products.contains(copy seed), E_EXISTS);
        store.products.add(copy seed, Product { version: 1, shop: signer::address_of(shop), products_url: url });
        event::emit<ProductCreated>(
            ProductCreated { seed, shop: signer::address_of(shop), ts: timestamp::now_seconds() }
        );
    }

    /// Update Product URL (shop-only)
    public(friend) fun update_product(
        shop: &signer,
        seed: vector<u8>,
        new_url: string::String
    ) acquires Products {
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(store.products.contains(copy seed), E_NOT_FOUND);
        let p = store.products.borrow_mut(copy seed);
        assert!(p.shop == signer::address_of(shop), E_NOT_OWNER);
        p.products_url = new_url;
        event::emit<ProductUpdated>(ProductUpdated { seed, ts: timestamp::now_seconds() });
    }

    /// Delete product (shop-only)
    public(friend) fun delete_product(
        shop: &signer,
        seed: vector<u8>
    ) acquires Products {
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(store.products.contains(copy seed), E_NOT_FOUND);
        let p = store.products.borrow_mut(copy seed);
        assert!(p.shop == signer::address_of(shop), E_NOT_OWNER);
        let _ = store.products.remove(copy seed);
        event::emit<ProductDeleted>(ProductDeleted { seed, ts: timestamp::now_seconds() });
    }
}

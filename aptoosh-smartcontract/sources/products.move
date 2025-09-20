module aptoosh::products {
    use std::option;
    use std::signer;
    use std::string;
    use aptos_std::table;
    use aptos_framework::account;
    use aptos_framework::event;

    friend aptoosh::aptoosh;

    // Inline constants used by products module
    const SEED_LEN: u64 = 22;

    const E_NOT_OWNER: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_BAD_SEED: u64 = 3;
    const E_EXISTS: u64 = 4;
    const E_NOT_FOUND: u64 = 5;
    const E_NOT_ADMIN: u64 = 8;

    const EVENT_CREATE: u8 = 1;
    const EVENT_UPDATE: u8 = 2;
    const EVENT_DELETE: u8 = 3;

    struct Product has copy, store, drop {
        version: u8,
        shop: address,
        seller_pubkey: vector<u8>,
        products_url: string::String
    }

    struct ProductEvents has key {
        event: event::EventHandle<ProductEvent>
    }

    #[event]
    struct ProductEvent has store, drop {
        seed: vector<u8>,
        action: u8
    }

    struct Products has key {
        products: table::Table<vector<u8>, Product>
    }

    /// One-time init for the products store (only @aptoosh).
    public(friend) fun init_products(publisher: &signer) {
        assert!(signer::address_of(publisher) == @aptoosh, E_NOT_ADMIN);
        assert!(!exists<Products>(@aptoosh), E_ALREADY_INITIALIZED);
        move_to<Products>(
            publisher,
            Products {
                products: table::new<vector<u8>, Product>()
            }
        );
        move_to(
            publisher,
            ProductEvents {
                event: account::new_event_handle<ProductEvent>(publisher)
            }
        );
    }

    /// Create Product
    public(friend) fun create_product(
        shop: &signer, seed: vector<u8>, seller_pubkey:vector<u8>, url: string::String
    ) acquires Products, ProductEvents {
        assert!(seed.length() == SEED_LEN, E_BAD_SEED);
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(!store.products.contains(copy seed), E_EXISTS);
        store.products.add(
            copy seed,
            Product { version: 1, shop: signer::address_of(shop), seller_pubkey, products_url: url }
        );

        let events = borrow_global_mut<ProductEvents>(@aptoosh);
        event::emit_event(
            &mut events.event, ProductEvent { seed, action: EVENT_CREATE }
        );
    }

    /// Update Product URL (shop-only)
    public(friend) fun update_product(
        shop: &signer, seed: vector<u8>, new_url: string::String
    ) acquires Products, ProductEvents {
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(store.products.contains(copy seed), E_NOT_FOUND);
        let p = store.products.borrow_mut(copy seed);
        assert!(p.shop == signer::address_of(shop), E_NOT_OWNER);
        p.products_url = new_url;

        let events = borrow_global_mut<ProductEvents>(@aptoosh);
        event::emit_event(
            &mut events.event, ProductEvent { seed, action: EVENT_UPDATE }
        )
    }

    /// Delete product (shop-only)
    public(friend) fun delete_product(
        shop: &signer, seed: vector<u8>
    ) acquires Products, ProductEvents {
        let store = borrow_global_mut<Products>(@aptoosh);
        assert!(store.products.contains(copy seed), E_NOT_FOUND);
        let p = store.products.borrow_mut(copy seed);
        assert!(p.shop == signer::address_of(shop), E_NOT_OWNER);
        let _ = store.products.remove(copy seed);

        let events = borrow_global_mut<ProductEvents>(@aptoosh);
        event::emit_event(
            &mut events.event, ProductEvent { seed, action: EVENT_DELETE }
        )
    }

    #[view]
    public fun get_product(seed: vector<u8>): option::Option<Product> acquires Products {
        if (!exists<Products>(@aptoosh)) {
            return option::none<Product>();
        };
        let store = borrow_global<Products>(@aptoosh);
        if (!store.products.contains(copy seed)) {
            return option::none<Product>();
        };
        let p = store.products.borrow(copy seed);
        option::some<Product>(*p)
    }
}


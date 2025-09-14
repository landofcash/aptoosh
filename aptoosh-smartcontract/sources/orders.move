module aptoosh::orders {
    use std::option;
    use std::signer;
    use std::vector;
    use aptos_std::table;
    use aptos_std::type_info;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptoosh::escrow;

    friend aptoosh::market;

    // Inline constants (Move consts are module-private; avoid cross-module getters)
    const SEED_LEN: u64 = 22;
    const FIVE_DAYS: u64 = 5 * 24 * 60 * 60;

    const S_INITIAL: u8 = 1;
    const S_PAID: u8 = 2;
    const S_DELIVERING: u8 = 3;
    const S_COMPLETED: u8 = 4;
    const S_REFUND_REQ: u8 = 5;
    const S_REFUNDED_TO_BUYER: u8 = 6;
    const S_REFUNDED_TO_SELLER: u8 = 7;

    const E_NOT_OWNER: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_BAD_SEED: u64 = 3;
    const E_EXISTS: u64 = 4;
    const E_NOT_FOUND: u64 = 5;
    const E_BAD_STATE: u64 = 6;
    const E_UNDERPAID: u64 = 7;
    const E_NOT_ADMIN: u64 = 8;

    struct OrderMeta has copy, store, drop {
        version: u8,
        product_seed: vector<u8>, // 22 bytes
        status: u8,
        price_amount: u64, // amount in smallest units of the chosen coin
        price_token_tag: option::Option<type_info::TypeInfo>,
        seller: address,
        buyer: address, // set at creation
        payer: option::Option<address>, // who actually paid (could be buyer or 3rd party)
        buyer_pubkey: vector<u8>, // 33B (secp) as in your legacy flow
        seller_pubkey: vector<u8>, // 33B
        enc_symkey_buyer: vector<u8>, // 129B
        enc_symkey_seller: vector<u8>, // 129B
        sym_key_hash: vector<u8>, // 32B
        payload_hash_buyer: vector<u8>, // 32B
        payload_hash_seller: vector<u8>, // 32B
        created_ts: u64,
        updated_ts: u64
    }

    #[event]
    struct OrderCreated has store, drop {
        seed: vector<u8>,
        seller: address,
        price: u64,
        ts: u64
    }

    #[event]
    struct OrderStatusChanged has store, drop {
        seed: vector<u8>,
        prev: u8,
        next: u8,
        ts: u64,
        actor: address
    }

    #[event]
    struct OrderDeleted has store, drop {
        seed: vector<u8>,
        ts: u64,
        actor: address
    }

    // Emitted when funds are released from escrow to seller
    #[event]
    struct EscrowPayout has store, drop {
        seed: vector<u8>,
        to: address,
        amount: u64,
        token: type_info::TypeInfo,
        ts: u64,
        actor: address
    }

    // Emitted when funds are refunded from escrow (to buyer/payer or to seller in edge cases)
    #[event]
    struct EscrowRefund has store, drop {
        seed: vector<u8>,
        to: address,
        amount: u64,
        token: type_info::TypeInfo,
        ts: u64,
        actor: address
    }

    /// Key for chunked encrypted address: avoids tuple-as-key uncertainty.
    struct AddrKey has copy, store, drop {
        seed: vector<u8>,
        idx: u32
    }

    struct Orders has key {
        by_id: table::Table<vector<u8>, OrderMeta>,
        // encrypted blobs just like b-<seed> and s-<seed> in Algoosh
        buyer_blob: table::Table<vector<u8>, vector<u8>>,
        seller_blob: table::Table<vector<u8>, vector<u8>>,

        // Optional: chunked encrypted address
        addr_chunks: table::Table<AddrKey, vector<u8>>
    }

    /// One-time init for orders (only @aptoosh).
    public(friend) fun init_orders(publisher: &signer) {
        assert!(signer::address_of(publisher) == @aptoosh, E_NOT_ADMIN);
        assert!(!exists<Orders>(@aptoosh), E_ALREADY_INITIALIZED);
        move_to<Orders>(
            publisher,
            Orders {
                by_id: table::new<vector<u8>, OrderMeta>(),
                buyer_blob: table::new<vector<u8>, vector<u8>>(),
                seller_blob: table::new<vector<u8>, vector<u8>>(),
                addr_chunks: table::new<AddrKey, vector<u8>>()
            }
        );
    }

    /* ----- Helpers ----- */
    fun emit_state(seed: vector<u8>, prev: u8, next: u8, actor: address) {
        event::emit<OrderStatusChanged>(
            OrderStatusChanged { seed, prev, next, ts: timestamp::now_seconds(), actor }
        );
    }

    /// Replace a value in a Table<K, vector<u8>> (remove if exists, then add).
    fun table_put_vec<K: copy + drop>(
        t: &mut table::Table<K, vector<u8>>,
        key: K,
        val: vector<u8>
    ) {
        t.upsert(key, val);
    }

    // Assert type arg matches stored coin type
    fun assert_order_coin<CoinType>(meta: &OrderMeta) {
        assert!(meta.price_token_tag.is_some::<type_info::TypeInfo> (), E_BAD_STATE);
        let stored = *meta.price_token_tag.borrow::<type_info::TypeInfo> ();
        let this = type_info::type_of<CoinType>();
        assert!(stored == this, E_BAD_STATE);
    }

    /* ----- Create order: Initial (no payment) ----- */
    public(friend) fun create_order_initial<CoinType>(
        buyer: &signer,
        seed: vector<u8>, // 22B
        product_seed: vector<u8>, // 22B
        seller: address,
        price_amount: u64,
        buyer_pubkey: vector<u8>,
        seller_pubkey: vector<u8>,
        enc_symkey_buyer: vector<u8>,
        enc_symkey_seller: vector<u8>,
        sym_key_hash: vector<u8>,
        payload_hash_buyer: vector<u8>,
        buyer_encrypted: vector<u8> // buyer's encrypted blob
    ) acquires Orders {
        assert!(
            seed.length() == SEED_LEN && product_seed.length() == SEED_LEN,
            E_BAD_SEED
        );

        let now = timestamp::now_seconds();
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(!store.by_id.contains(copy seed), E_EXISTS);

        let meta = OrderMeta {
            version: 1,
            product_seed,
            status: S_INITIAL,
            price_amount,
            price_token_tag: option::some<type_info::TypeInfo>(
                type_info::type_of<CoinType>()
            ),
            seller,
            buyer: signer::address_of(buyer),
            payer: option::none<address>(),
            buyer_pubkey,
            seller_pubkey,
            enc_symkey_buyer,
            enc_symkey_seller,
            sym_key_hash,
            payload_hash_buyer,
            payload_hash_seller: vector::empty<u8>(),
            created_ts: now,
            updated_ts: now
        };

        store.by_id.add(copy seed, meta);
        table_put_vec<vector<u8>>(&mut store.buyer_blob, copy seed, buyer_encrypted);

        event::emit<OrderCreated>(
            OrderCreated { seed, seller, price: price_amount, ts: now }
        );
    }

    /* ----- Create order + Pay (escrow) in one tx ----- */
    public(friend) fun create_order_paid<CoinType>(
        buyer: &signer,
        seed: vector<u8>,
        product_seed: vector<u8>,
        seller: address,
        buyer_pubkey: vector<u8>,
        seller_pubkey: vector<u8>,
        enc_symkey_buyer: vector<u8>,
        enc_symkey_seller: vector<u8>,
        sym_key_hash: vector<u8>,
        payload_hash_buyer: vector<u8>,
        buyer_encrypted: vector<u8>,
        amount: u64,
        required_price: u64
    ) acquires Orders {
        assert!(
            seed.length() == SEED_LEN && product_seed.length() == SEED_LEN,
            E_BAD_SEED
        );
        assert!(amount == required_price, E_UNDERPAID);

        escrow::deposit<CoinType>(buyer, amount);

        let now = timestamp::now_seconds();
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(!store.by_id.contains(copy seed), E_EXISTS);

        let meta = OrderMeta {
            version: 1,
            product_seed,
            status: S_PAID,
            price_amount: required_price,
            price_token_tag: option::some<type_info::TypeInfo>(
                type_info::type_of<CoinType>()
            ),
            seller,
            buyer: signer::address_of(buyer),
            payer: option::some<address>(signer::address_of(buyer)),
            buyer_pubkey,
            seller_pubkey,
            enc_symkey_buyer,
            enc_symkey_seller,
            sym_key_hash,
            payload_hash_buyer,
            payload_hash_seller: vector::empty<u8>(),
            created_ts: now,
            updated_ts: now
        };

        store.by_id.add(copy seed, meta);
        table_put_vec<vector<u8>>(&mut store.buyer_blob, copy seed, buyer_encrypted);

        event::emit<OrderCreated>(
            OrderCreated { seed: copy seed, seller, price: required_price, ts: now }
        );
        emit_state(
            seed,
            S_INITIAL,
            S_PAID,
            signer::address_of(buyer)
        );
    }

    /* ----- Pay for existing INITIAL order ----- */
    public(friend) fun buy_order<CoinType>(
        payer: &signer, seed: vector<u8>, amount: u64
    ) acquires Orders {
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(meta.status == S_INITIAL, E_BAD_STATE);

        assert!(amount == meta.price_amount, E_UNDERPAID);

        // Enforce preset token or set it now
        if (meta.price_token_tag.is_some::<type_info::TypeInfo> ()) {
            let stored = *meta.price_token_tag.borrow::<type_info::TypeInfo> ();
            let this = type_info::type_of<CoinType>();
            assert!(stored == this, E_BAD_STATE);
        } else {
            meta.price_token_tag = option::some<type_info::TypeInfo>(
                type_info::type_of<CoinType>()
            );
        };

        escrow::deposit<CoinType>(payer, amount);

        let prev = meta.status;
        meta.status = S_PAID;
        meta.payer = option::some<address>(signer::address_of(payer));
        meta.updated_ts = timestamp::now_seconds();

        emit_state(seed, prev, S_PAID, signer::address_of(payer));
    }

    /* ----- Seller starts delivering (uploads seller blob + hash) ----- */
    public(friend) fun start_delivering(
        seller_signer: &signer,
        seed: vector<u8>,
        payload_hash_seller: vector<u8>,
        seller_encrypted: vector<u8>
    ) acquires Orders {
        let seller_addr = signer::address_of(seller_signer);
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(meta.seller == seller_addr, E_NOT_OWNER);
        assert!(meta.status == S_PAID, E_BAD_STATE);

        meta.payload_hash_seller = payload_hash_seller;
        let prev = meta.status;
        meta.status = S_DELIVERING;
        meta.updated_ts = timestamp::now_seconds();

        table_put_vec<vector<u8>>(&mut store.seller_blob, copy seed, seller_encrypted);
        emit_state(seed, prev, S_DELIVERING, seller_addr);
    }

    /* ----- Buyer confirms; funds released to seller ----- */
    public(friend) fun confirm_order<CoinType>(
        buyer_signer: &signer, seed: vector<u8>
    ) acquires Orders {
        let buyer_addr = signer::address_of(buyer_signer);
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(meta.buyer == buyer_addr, E_NOT_OWNER);
        assert!(meta.status == S_DELIVERING, E_BAD_STATE);

        assert_order_coin<CoinType>(meta);
        // Payout from escrow to seller
        escrow::payout<CoinType>(meta.seller, meta.price_amount);
        let token = type_info::type_of<CoinType>();
        event::emit<EscrowPayout>(
            EscrowPayout {
                seed: copy seed,
                to: meta.seller,
                amount: meta.price_amount,
                token,
                ts: timestamp::now_seconds(),
                actor: buyer_addr
            }
        );

        let prev = meta.status;
        meta.status = S_COMPLETED;
        meta.updated_ts = timestamp::now_seconds();
        emit_state(seed, prev, S_COMPLETED, buyer_addr);
    }

    /* ----- Buyer requests refund (manual arbitration) ----- */
    public(friend) fun require_refund(
        buyer_signer: &signer, seed: vector<u8>
    ) acquires Orders {
        let buyer_addr = signer::address_of(buyer_signer);
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(meta.buyer == buyer_addr, E_NOT_OWNER);
        assert!(
            meta.status == S_PAID || meta.status == S_DELIVERING,
            E_BAD_STATE
        );

        let prev = meta.status;
        meta.status = S_REFUND_REQ;
        meta.updated_ts = timestamp::now_seconds();
        emit_state(seed, prev, S_REFUND_REQ, buyer_addr);
    }

    /* ----- Admin processes refund to BUYER ----- */
    public(friend) fun process_refund_to_buyer<CoinType>(
        admin: &signer, seed: vector<u8>
    ) acquires Orders {
        assert!(signer::address_of(admin) == @aptoosh, E_NOT_ADMIN);

        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(
            meta.status == S_REFUND_REQ || meta.status == S_PAID,
            E_BAD_STATE
        );

        assert_order_coin<CoinType>(meta);
        let to_addr =
            if (meta.payer.is_some()) {
                *meta.payer.borrow()
            } else {
                meta.buyer
            };
        escrow::payout<CoinType>(to_addr, meta.price_amount);
        let token = type_info::type_of<CoinType>();
        event::emit<EscrowRefund>(
            EscrowRefund {
                seed: copy seed,
                to: to_addr,
                amount: meta.price_amount,
                token,
                ts: timestamp::now_seconds(),
                actor: signer::address_of(admin)
            }
        );

        let prev = meta.status;
        meta.status = S_REFUNDED_TO_BUYER;
        meta.updated_ts = timestamp::now_seconds();
        emit_state(
            seed,
            prev,
            S_REFUNDED_TO_BUYER,
            signer::address_of(admin)
        );
    }

    /* ----- Admin processes refund to SELLER (edge cases) ----- */
    public(friend) fun process_refund_to_seller<CoinType>(
        admin: &signer, seed: vector<u8>
    ) acquires Orders {
        assert!(signer::address_of(admin) == @aptoosh, E_NOT_ADMIN);

        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert!(
            meta.status == S_REFUND_REQ || meta.status == S_PAID,
            E_BAD_STATE
        );

        assert_order_coin<CoinType>(meta);
        escrow::payout<CoinType>(meta.seller, meta.price_amount);
        let token = type_info::type_of<CoinType>();
        event::emit<EscrowRefund>(
            EscrowRefund {
                seed: copy seed,
                to: meta.seller,
                amount: meta.price_amount,
                token,
                ts: timestamp::now_seconds(),
                actor: signer::address_of(admin)
            }
        );

        let prev = meta.status;
        meta.status = S_REFUNDED_TO_SELLER;
        meta.updated_ts = timestamp::now_seconds();
        emit_state(
            seed,
            prev,
            S_REFUNDED_TO_SELLER,
            signer::address_of(admin)
        );
    }

    /* ----- Auto timeouts (anyone can trigger) ----- */
    public(friend) fun check_timeouts<CoinType>(
        _caller: &signer, seed: vector<u8>
    ) acquires Orders {
        let now = timestamp::now_seconds();
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow_mut(copy seed);
        assert_order_coin<CoinType>(meta);

        let age = now - meta.updated_ts;
        if (meta.status == S_DELIVERING && age >= FIVE_DAYS) {
            // Auto-complete → pay seller
            escrow::payout<CoinType>(meta.seller, meta.price_amount);
            let token = type_info::type_of<CoinType>();
            event::emit<EscrowPayout>(
                EscrowPayout {
                    seed: copy seed,
                    to: meta.seller,
                    amount: meta.price_amount,
                    token,
                    ts: timestamp::now_seconds(),
                    actor: @aptoosh
                }
            );

            let prev = meta.status;
            meta.status = S_COMPLETED;
            meta.updated_ts = now;
            emit_state(seed, prev, S_COMPLETED, @aptoosh);
            return;
        };

        if (meta.status == S_PAID && age >= FIVE_DAYS) {
            // Auto-refund to buyer/payer
            let to_addr =
                if (meta.payer.is_some()) {
                    *meta.payer.borrow()
                } else {
                    meta.buyer
                };
            escrow::payout<CoinType>(to_addr, meta.price_amount);
            let token = type_info::type_of<CoinType>();
            event::emit<EscrowRefund>(
                EscrowRefund {
                    seed: copy seed,
                    to: to_addr,
                    amount: meta.price_amount,
                    token,
                    ts: timestamp::now_seconds(),
                    actor: @aptoosh
                }
            );

            let prev2 = meta.status;
            meta.status = S_REFUNDED_TO_BUYER;
            meta.updated_ts = now;
            emit_state(seed, prev2, S_REFUNDED_TO_BUYER, @aptoosh);
        };
    }
    
    /* ----- Optional: chunked encrypted address ----- */
    public(friend) fun set_addr_chunk(
        actor: &signer,
        seed: vector<u8>,
        chunk_idx: u32,
        chunk: vector<u8>
    ) acquires Orders {
        // Gate: seller or buyer may update; change if you need stricter policy
        let actor_addr = signer::address_of(actor);
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow(copy seed);
        assert!(
            meta.seller == actor_addr || meta.buyer == actor_addr,
            E_NOT_OWNER
        );

        // Write/overwrite chunk
        let key = AddrKey { seed: copy seed, idx: chunk_idx };
        table_put_vec<AddrKey>(&mut store.addr_chunks, key, chunk);
    }

    /* ----- Cleanup (rebates go to tx sender) ----- */
    public(friend) fun delete_order(caller: &signer, seed: vector<u8>) acquires Orders {
        let caller_addr = signer::address_of(caller);
        let store = borrow_global_mut<Orders>(@aptoosh);
        assert!(store.by_id.contains(copy seed), E_NOT_FOUND);
        let meta = store.by_id.borrow(copy seed);

        // Only seller or admin; only terminal states
        let is_admin = caller_addr == @aptoosh;
        assert!(
            is_admin || meta.seller == caller_addr,
            E_NOT_OWNER
        );
        assert!(
            meta.status == S_COMPLETED
                || meta.status == S_REFUNDED_TO_BUYER
                || meta.status == S_REFUNDED_TO_SELLER,
            E_BAD_STATE
        );

        // Remove blobs (rebate)
        if (store.buyer_blob.contains(copy seed)) {
            let _ = store.buyer_blob.remove(copy seed);
        };
        if (store.seller_blob.contains(copy seed)) {
            let _ = store.seller_blob.remove(copy seed);
        };

        // Remove metadata (rebate)
        let _ = store.by_id.remove(copy seed);
        event::emit<OrderDeleted>(
            OrderDeleted { seed, ts: timestamp::now_seconds(), actor: caller_addr }
        );
    }

    // ----- Read-only view: full order snapshot (OrderMeta) -----
    #[view]
    public fun get_order(seed: vector<u8>): option::Option<OrderMeta> acquires Orders {
        if (!exists<Orders>(@aptoosh)) {
            return option::none<OrderMeta>();
        };
        let store = borrow_global<Orders>(@aptoosh);
        if (!store.by_id.contains(copy seed)) {
            return option::none<OrderMeta>();
        };

        let m = store.by_id.borrow(copy seed);
        option::some<OrderMeta>(*m)
    }

    // ----- Read-only view: buyer blob bytes -----
    #[view]
    public fun get_buyer_blob(seed: vector<u8>): option::Option<vector<u8>> acquires Orders {
        if (!exists<Orders>(@aptoosh)) {
            return option::none<vector<u8>>();
        };
        let store = borrow_global<Orders>(@aptoosh);
        if (!store.buyer_blob.contains(copy seed)) {
            return option::none<vector<u8>>();
        };
        let v = store.buyer_blob.borrow(copy seed);
        option::some<vector<u8>>(*v)
    }

    // ----- Read-only view: seller blob bytes -----
    #[view]
    public fun get_seller_blob(seed: vector<u8>): option::Option<vector<u8>> acquires Orders {
        if (!exists<Orders>(@aptoosh)) {
            return option::none<vector<u8>>();
        };
        let store = borrow_global<Orders>(@aptoosh);
        if (!store.seller_blob.contains(copy seed)) {
            return option::none<vector<u8>>();
        };
        let v = store.seller_blob.borrow(copy seed);
        option::some<vector<u8>>(*v)
    }
}


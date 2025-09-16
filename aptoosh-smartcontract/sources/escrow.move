module aptoosh::escrow {
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;

    friend aptoosh::orders;
    friend aptoosh::aptoosh;

    // Inline constants for this module
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_ADMIN: u64 = 8;

    /// Holds the SignerCapability for the module's resource account (escrow).
    /// Stored under the module publisher address (@aptoosh).
    struct EscrowCap has key { cap: account::SignerCapability }

    /// Initialize the escrow resource account once. Only @aptoosh may call.
    /// Pass any seed bytes to derive the resource account.
    public(friend) fun init_escrow(admin: &signer, seed: vector<u8>) {
        assert!(signer::address_of(admin) == @aptoosh, E_NOT_ADMIN);
        assert!(!exists<EscrowCap>(@aptoosh), E_ALREADY_INITIALIZED);

        let (_ra_addr, cap) = account::create_resource_account(admin, seed);
        // Register AptosCoin at the escrow so it can receive APT.
        let esc = account::create_signer_with_capability(&cap);
        coin::register<AptosCoin>(&esc);

        move_to<EscrowCap>(admin, EscrowCap { cap });
    }

    /// Internal: signer for the escrow RA (private).
    fun escrow_signer(): signer acquires EscrowCap {
        account::create_signer_with_capability(&borrow_global<EscrowCap>(@aptoosh).cap)
    }

    /// Admin registers the escrow resource account for an arbitrary coin type so it can receive it.
    public(friend) fun register_escrow_coin<CoinType>(admin: &signer) acquires EscrowCap {
        assert!(signer::address_of(admin) == @aptoosh, E_NOT_ADMIN);
        let esc = escrow_signer();
        coin::register<CoinType>(&esc);
    }

    // Friend-only: deposit from a user into escrow
    public(friend) fun deposit<CoinType>(from: &signer, amount: u64) acquires EscrowCap {
        let esc = escrow_signer();
        coin::transfer<CoinType>(from, signer::address_of(&esc), amount);
    }

    // Friend-only: pay out from escrow to a recipient
    public(friend) fun payout<CoinType>(to: address, amount: u64) acquires EscrowCap {
        let esc = escrow_signer();
        coin::transfer<CoinType>(&esc, to, amount);
    }
}

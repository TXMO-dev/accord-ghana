#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, BytesN, Env, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum State { Draft, Funded, Submitted, Disputed, Released, Cancelled }
#[contracttype]
#[derive(Clone)]
pub struct Agreement {
    pub buyer: Address,
    pub seller: Address,
    pub asset: Address,
    pub amount: i128,
    pub terms: BytesN<32>,
    pub evidence: Option<BytesN<32>>,
    pub state: State,
}
#[contract]
pub struct Accord;
#[contracttype]
#[derive(Clone)]
pub enum ProfileKey { User(Address) }
#[contracttype]
#[derive(Clone)]
pub enum Key { Asset, Agreement(BytesN<32>) }
#[contracttype]
#[derive(Clone)]
pub struct Profile { pub name: String, pub registered_at: u64 }
fn read(e: &Env, id: &BytesN<32>) -> Agreement {
    e.storage().persistent().get(&Key::Agreement(id.clone())).expect("agreement not found")
}
fn write(e: &Env, id: &BytesN<32>, a: &Agreement) {
    let key = Key::Agreement(id.clone());
    e.storage().persistent().set(&key, a);
    e.storage().persistent().extend_ttl(&key, 100_000, 500_000);
    e.storage().instance().extend_ttl(100_000, 500_000);
    e.events().publish((soroban_sdk::symbol_short!("milestone"), id.clone()), a.state.clone());
}
#[contractimpl]
impl Accord {
    pub fn __constructor(e: Env, asset: Address) {
        e.storage().instance().set(&Key::Asset, &asset);
        e.storage().instance().extend_ttl(100_000, 500_000);
    }
    pub fn register(e: Env, user: Address, name: String) {
        user.require_auth();
        assert!(name.len() > 0 && name.len() <= 64, "name must be 1-64 bytes");
        let key = ProfileKey::User(user);
        assert!(!e.storage().persistent().has(&key), "already registered");
        e.storage().persistent().set(&key, &Profile { name, registered_at: e.ledger().timestamp() });
        e.storage().persistent().extend_ttl(&key, 100_000, 500_000);
        e.storage().instance().extend_ttl(100_000, 500_000);
    }
    pub fn profile(e: Env, user: Address) -> Option<Profile> {
        e.storage().persistent().get(&ProfileKey::User(user))
    }
    pub fn create(e: Env, id: BytesN<32>, buyer: Address, seller: Address, asset: Address, amount: i128, terms: BytesN<32>) {
        buyer.require_auth();
        assert!(buyer != seller, "distinct parties required");
        assert!(amount > 0, "positive amount required");
        let allowed: Address = e.storage().instance().get(&Key::Asset).expect("missing asset");
        assert!(asset == allowed, "unsupported asset");
        assert!(!e.storage().persistent().has(&Key::Agreement(id.clone())), "duplicate agreement");
        write(&e, &id, &Agreement {buyer, seller, asset, amount, terms, evidence: None, state: State::Draft});
    }
    pub fn get(e: Env, id: BytesN<32>) -> Agreement { read(&e, &id) }
    pub fn fund(e: Env, id: BytesN<32>) {
        let mut a = read(&e, &id); a.buyer.require_auth();
        assert!(a.state == State::Draft, "not draft");
        a.state = State::Funded; write(&e, &id, &a);
        token::Client::new(&e, &a.asset).transfer(&a.buyer, &e.current_contract_address(), &a.amount);
    }
    pub fn submit(e: Env, id: BytesN<32>, evidence: BytesN<32>) {
        let mut a = read(&e, &id); a.seller.require_auth();
        assert!(a.state == State::Funded, "not funded");
        a.evidence = Some(evidence); a.state = State::Submitted; write(&e, &id, &a);
    }
    pub fn release(e: Env, id: BytesN<32>) {
        let mut a = read(&e, &id); a.buyer.require_auth();
        assert!(a.state == State::Submitted, "not submitted");
        a.state = State::Released; write(&e, &id, &a);
        token::Client::new(&e, &a.asset).transfer(&e.current_contract_address(), &a.seller, &a.amount);
    }
    pub fn dispute(e: Env, id: BytesN<32>, actor: Address) {
        let mut a = read(&e, &id); actor.require_auth();
        assert!(actor == a.buyer || actor == a.seller, "not a party");
        assert!(a.state == State::Funded || a.state == State::Submitted, "not active");
        a.state = State::Disputed; write(&e, &id, &a);
    }
    // Mutual settlement only. No administrator can move funds.
    // Deadlock requires both parties to agree; disclose before funding.
    pub fn settle(e: Env, id: BytesN<32>, seller_amount: i128) {
        let mut a = read(&e, &id);
        a.buyer.require_auth(); a.seller.require_auth();
        assert!(a.state == State::Disputed || a.state == State::Funded || a.state == State::Submitted, "not active");
        assert!(seller_amount >= 0 && seller_amount <= a.amount, "invalid split");
        a.state = State::Cancelled; write(&e, &id, &a);
        let t = token::Client::new(&e, &a.asset);
        if seller_amount > 0 { t.transfer(&e.current_contract_address(), &a.seller, &seller_amount); }
        if seller_amount < a.amount { t.transfer(&e.current_contract_address(), &a.buyer, &(a.amount - seller_amount)); }
    }
}

#[cfg(test)]
mod tests;

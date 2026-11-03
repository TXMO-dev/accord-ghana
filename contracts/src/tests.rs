use crate::{Accord, AccordClient, Key, ProfileKey, State};
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, Ledger, MockAuth, MockAuthInvoke, storage::{Instance, Persistent}},
    token, Address, BytesN, Env, IntoVal, String, Symbol, Val, Vec,
};

struct Fixture { env: Env, contract: Address, buyer: Address, seller: Address, asset: Address, id: BytesN<32> }
impl Fixture {
    fn new(balance: i128) -> Self {
        let env = Env::default();
        env.ledger().with_mut(|l| { l.sequence_number = 100; l.max_entry_ttl = 600_000; });
        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let admin = Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(admin).address();
        let contract = env.register(Accord, (asset.clone(),));
        token::StellarAssetClient::new(&env, &asset).mock_all_auths().mint(&buyer, &balance);
        let id = BytesN::from_array(&env, &[1; 32]);
        Self { env, contract, buyer, seller, asset, id }
    }
    fn client(&self) -> AccordClient<'_> { AccordClient::new(&self.env, &self.contract) }
    fn create(&self, amount: i128) {
        self.client().mock_all_auths().create(&self.id, &self.buyer, &self.seller, &self.asset, &amount, &BytesN::from_array(&self.env, &[2;32]));
    }
    fn fund(&self, amount: i128) { self.create(amount); self.client().mock_all_auths().fund(&self.id); }
    fn balance(&self, address: &Address) -> i128 { token::Client::new(&self.env, &self.asset).balance(address) }
    fn auth(&self, method: &str, args: Vec<Val>, parties: &[Address]) {
        let auths = self.env.auths();
        assert_eq!(auths.len(), parties.len());
        for party in parties {
            let invocation = &auths.iter().find(|(address,_)| address == party).expect("required signer missing").1;
            assert_eq!(invocation.function, AuthorizedFunction::Contract((self.contract.clone(), Symbol::new(&self.env, method), args.clone())));
        }
    }
}

#[test]
fn lifecycle_requires_correct_signers_and_moves_exact_balance() {
    let f=Fixture::new(100); f.create(75);
    f.auth("create", (&f.id,&f.buyer,&f.seller,&f.asset,75i128,BytesN::from_array(&f.env,&[2;32])).into_val(&f.env), &[f.buyer.clone()]);
    f.client().mock_all_auths().fund(&f.id);
    f.auth("fund", (&f.id,).into_val(&f.env), &[f.buyer.clone()]);
    let auth=f.env.auths();
    assert_eq!(auth[0].1.sub_invocations.len(),1);
    assert_eq!(auth[0].1.sub_invocations[0].function,AuthorizedFunction::Contract((f.asset.clone(),Symbol::new(&f.env,"transfer"),(&f.buyer,&f.contract,75i128).into_val(&f.env))));
    assert_eq!(f.balance(&f.buyer),25);assert_eq!(f.balance(&f.contract),75);
    let proof=BytesN::from_array(&f.env,&[3;32]);
    f.client().mock_all_auths().submit(&f.id,&proof);
    f.auth("submit",(&f.id,&proof).into_val(&f.env),&[f.seller.clone()]);
    assert_eq!(f.client().get(&f.id).evidence,Some(proof));
    f.client().mock_all_auths().release(&f.id);
    f.auth("release",(&f.id,).into_val(&f.env),&[f.buyer.clone()]);
    assert_eq!(f.client().get(&f.id).state,State::Released);
    assert_eq!(f.balance(&f.buyer),25);assert_eq!(f.balance(&f.seller),75);assert_eq!(f.balance(&f.contract),0);
    assert!(f.client().mock_all_auths().try_release(&f.id).is_err());
    assert_eq!(f.balance(&f.seller),75);
}

#[test]
fn creation_rejects_invalid_amount_same_party_wrong_asset_and_duplicates() {
    let f=Fixture::new(100);let terms=BytesN::from_array(&f.env,&[2;32]);
    for amount in [0,-1,i128::MIN] {
        assert!(f.client().mock_all_auths().try_create(&f.id,&f.buyer,&f.seller,&f.asset,&amount,&terms).is_err());
        assert!(f.client().try_get(&f.id).is_err());
    }
    assert!(f.client().mock_all_auths().try_create(&f.id,&f.buyer,&f.buyer,&f.asset,&1,&terms).is_err());
    assert!(f.client().mock_all_auths().try_create(&f.id,&f.buyer,&f.seller,&Address::generate(&f.env),&1,&terms).is_err());
    f.create(75);
    assert!(f.client().mock_all_auths().try_create(&f.id,&f.buyer,&f.seller,&f.asset,&99,&terms).is_err());
    assert_eq!(f.client().get(&f.id).amount,75);
}

#[test]
fn missing_authorization_cannot_create_fund_submit_or_release() {
    let f=Fixture::new(100);let terms=BytesN::from_array(&f.env,&[2;32]);
    assert!(f.client().mock_auths(&[]).try_create(&f.id,&f.buyer,&f.seller,&f.asset,&75,&terms).is_err());
    f.create(75);
    assert!(f.client().mock_auths(&[]).try_fund(&f.id).is_err());
    assert_eq!(f.balance(&f.contract),0);assert_eq!(f.client().get(&f.id).state,State::Draft);
    f.client().mock_all_auths().fund(&f.id);
    assert!(f.client().mock_auths(&[]).try_submit(&f.id,&terms).is_err());
    f.client().mock_all_auths().submit(&f.id,&terms);
    assert!(f.client().mock_auths(&[]).try_release(&f.id).is_err());
    assert_eq!(f.balance(&f.contract),75);assert_eq!(f.balance(&f.seller),0);
}

#[test]
fn failed_token_transfer_rolls_back_state_and_balances() {
    let f=Fixture::new(10);f.create(11);
    assert!(f.client().mock_all_auths().try_fund(&f.id).is_err());
    assert_eq!(f.client().get(&f.id).state,State::Draft);
    assert_eq!(f.balance(&f.buyer),10);assert_eq!(f.balance(&f.contract),0);
}

#[test]
fn invalid_state_transitions_do_not_move_funds() {
    let f=Fixture::new(100);f.create(75);let proof=BytesN::from_array(&f.env,&[3;32]);
    assert!(f.client().mock_all_auths().try_submit(&f.id,&proof).is_err());
    assert!(f.client().mock_all_auths().try_release(&f.id).is_err());
    assert!(f.client().mock_all_auths().try_dispute(&f.id,&f.buyer).is_err());
    assert!(f.client().mock_all_auths().try_settle(&f.id,&0).is_err());
    f.client().mock_all_auths().fund(&f.id);
    assert!(f.client().mock_all_auths().try_fund(&f.id).is_err());
    assert!(f.client().mock_all_auths().try_release(&f.id).is_err());
    assert_eq!(f.balance(&f.contract),75);assert_eq!(f.balance(&f.buyer),25);
}

#[test]
fn either_party_can_dispute_but_an_outsider_cannot() {
    for seller_disputes in [false,true] {
        let f=Fixture::new(100);f.fund(75);
        assert!(f.client().mock_all_auths().try_dispute(&f.id,&Address::generate(&f.env)).is_err());
        let actor=if seller_disputes { &f.seller } else { &f.buyer };
        assert!(f.client().mock_auths(&[]).try_dispute(&f.id,actor).is_err());
        f.client().mock_all_auths().dispute(&f.id,actor);
        f.auth("dispute",(&f.id,actor).into_val(&f.env),&[actor.clone()]);
        assert_eq!(f.client().get(&f.id).state,State::Disputed);
        assert!(f.client().mock_all_auths().try_release(&f.id).is_err());
        assert!(f.client().mock_all_auths().try_submit(&f.id,&BytesN::from_array(&f.env,&[3;32])).is_err());
        assert_eq!(f.balance(&f.contract),75);
    }
}

#[test]
fn settlement_requires_both_exact_authorizations() {
    let f=Fixture::new(100);f.fund(75);
    f.client().mock_all_auths().dispute(&f.id,&f.buyer);
    for signer in [&f.buyer,&f.seller] {
        assert!(f.client().mock_auths(&[MockAuth {address:signer, invoke:&MockAuthInvoke {
            contract:&f.contract,fn_name:"settle",args:(&f.id,25i128).into_val(&f.env),sub_invokes:&[]
        }}]).try_settle(&f.id,&25).is_err());
        assert_eq!(f.client().get(&f.id).state,State::Disputed);assert_eq!(f.balance(&f.contract),75);
    }
    let invocation=MockAuthInvoke {contract:&f.contract,fn_name:"settle",args:(&f.id,25i128).into_val(&f.env),sub_invokes:&[]};
    let approvals=[MockAuth {address:&f.buyer,invoke:&invocation},MockAuth {address:&f.seller,invoke:&invocation}];
    assert!(f.client().mock_auths(&approvals).try_settle(&f.id,&26).is_err());
    f.client().mock_auths(&approvals).settle(&f.id,&25);
    f.auth("settle",(&f.id,25i128).into_val(&f.env),&[f.buyer.clone(),f.seller.clone()]);
    assert!(f.env.auths().iter().all(|(_,a)| a.sub_invocations.is_empty()));
    assert_eq!(f.balance(&f.buyer),75);assert_eq!(f.balance(&f.seller),25);assert_eq!(f.balance(&f.contract),0);
}

#[test]
fn settlement_conserves_every_unit_at_split_boundaries_and_rejects_replay() {
    for amount in [1,2,10_000_001,i64::MAX as i128] {
        for seller_amount in [0,1,amount/2,amount-1,amount] {
            let f=Fixture::new(amount);f.fund(amount);
            f.client().mock_all_auths().settle(&f.id,&seller_amount);
            assert_eq!(f.balance(&f.seller),seller_amount);assert_eq!(f.balance(&f.buyer),amount-seller_amount);
            assert_eq!(f.balance(&f.contract),0);assert_eq!(f.client().get(&f.id).state,State::Cancelled);
            assert!(f.client().mock_all_auths().try_settle(&f.id,&seller_amount).is_err());
            assert!(f.client().mock_all_auths().try_release(&f.id).is_err());
            assert_eq!(f.balance(&f.buyer)+f.balance(&f.seller),amount);
        }
    }
}

#[test]
fn settlement_rejects_negative_excess_and_extreme_splits() {
    let f=Fixture::new(100);f.fund(75);
    for amount in [-1,76,i128::MIN,i128::MAX] {
        assert!(f.client().mock_all_auths().try_settle(&f.id,&amount).is_err());
        assert_eq!(f.client().get(&f.id).state,State::Funded);assert_eq!(f.balance(&f.contract),75);
    }
}

#[test]
fn settlement_supported_in_all_three_active_states() {
    for state in [State::Funded,State::Submitted,State::Disputed] {
        let f=Fixture::new(100);f.fund(75);
        if state==State::Submitted { f.client().mock_all_auths().submit(&f.id,&BytesN::from_array(&f.env,&[3;32])); }
        if state==State::Disputed { f.client().mock_all_auths().dispute(&f.id,&f.seller); }
        f.client().mock_all_auths().settle(&f.id,&25);
        assert_eq!(f.client().get(&f.id).state,State::Cancelled);assert_eq!(f.balance(&f.contract),0);
    }
}

#[test]
fn one_settlement_does_not_spend_another_agreements_escrow() {
    let f=Fixture::new(100);f.fund(40);let second=BytesN::from_array(&f.env,&[9;32]);
    f.client().mock_all_auths().create(&second,&f.buyer,&f.seller,&f.asset,&60,&BytesN::from_array(&f.env,&[2;32]));
    f.client().mock_all_auths().fund(&second);
    f.client().mock_all_auths().settle(&f.id,&10);
    assert_eq!(f.balance(&f.contract),60);assert_eq!(f.client().get(&second).state,State::Funded);
    assert_eq!(f.balance(&f.seller),10);assert_eq!(f.balance(&f.buyer),30);
}

#[test]
fn profiles_require_auth_and_enforce_byte_limits_and_uniqueness() {
    let f=Fixture::new(1);
    assert!(f.client().mock_auths(&[]).try_register(&f.buyer,&String::from_str(&f.env,"Timothy")).is_err());
    for name in ["", &"a".repeat(65), &"é".repeat(33)] {
        assert!(f.client().mock_all_auths().try_register(&f.buyer,&String::from_str(&f.env,name)).is_err());
    }
    f.env.ledger().set_timestamp(1234);
    let name=String::from_str(&f.env,&"a".repeat(64));
    f.client().mock_all_auths().register(&f.buyer,&name);
    f.auth("register",(&f.buyer,&name).into_val(&f.env),&[f.buyer.clone()]);
    let profile=f.client().profile(&f.buyer).unwrap();assert_eq!(profile.name,name);assert_eq!(profile.registered_at,1234);
    assert!(f.client().mock_all_auths().try_register(&f.buyer,&String::from_str(&f.env,"replacement")).is_err());
    assert_eq!(f.client().profile(&f.buyer).unwrap().name,name);
    assert!(f.client().profile(&f.seller).is_none());
}

#[test]
fn agreement_and_instance_ttl_extend_when_write_crosses_threshold() {
    let f=Fixture::new(100);f.fund(75);
    let key=Key::Agreement(f.id.clone());
    let initial=f.env.as_contract(&f.contract,||f.env.storage().persistent().get_ttl(&key));
    assert_eq!(initial,500_000);
    f.env.ledger().set_sequence_number(400_101);
    let before=f.env.as_contract(&f.contract,||f.env.storage().persistent().get_ttl(&key));
    assert!(before<100_000);
    f.client().mock_all_auths().submit(&f.id,&BytesN::from_array(&f.env,&[3;32]));
    f.env.as_contract(&f.contract,||{
        assert_eq!(f.env.storage().persistent().get_ttl(&key),500_000);
        assert_eq!(f.env.storage().instance().get_ttl(),500_000);
    });
}

#[test]
fn reads_do_not_renew_profile_or_agreement_lifetime() {
    let f=Fixture::new(100);f.create(75);
    f.client().mock_all_auths().register(&f.buyer,&String::from_str(&f.env,"Timothy"));
    f.env.ledger().set_sequence_number(400_101);
    let key=Key::Agreement(f.id.clone());let profile=ProfileKey::User(f.buyer.clone());
    let before=f.env.as_contract(&f.contract,|| (f.env.storage().persistent().get_ttl(&key),f.env.storage().persistent().get_ttl(&profile)));
    f.client().get(&f.id);f.client().profile(&f.buyer);
    assert_eq!(before,f.env.as_contract(&f.contract,|| (f.env.storage().persistent().get_ttl(&key),f.env.storage().persistent().get_ttl(&profile))));
}

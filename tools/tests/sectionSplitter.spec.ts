import { expect } from "chai"
import { splitSections } from "../src"
describe("SectionSplitter", () => {

  it("breaks down markdown into sections based on token length, attempting to respect sections", () => {
    const split = splitSections(longPost, 2000)
    expect(split).to.have.length(2)
  })

})

const post = `
[](https://skale.space/blog/introducing-the-levitation-protocol-skales-solution-for-decentralized-zero-knowledge-proofs)

Introducing Levitation Protocol: The Future of ZK Scaling

[](/)

[Home](/)

[

Network

](/network)

[Stats](/stats)[Ecosystem](/ecosystem)[Token](https://skale.space/network/#token)

[

Developers

](/developers)

[Grants](https://skale.space/developers/#grants)[Validators](https://skale.space/developers/#validators)

[Blog](/blog)[Community](/community)[About](/about)

*   [](#)
*   [](#)
*   [](#)
*   [](#)
`

const longPost = `
[](https://skale.space/blog/introducing-the-levitation-protocol-skales-solution-for-decentralized-zero-knowledge-proofs)

Introducing Levitation Protocol: The Future of ZK Scaling

[](/)

[Home](/)

[

Network

](/network)

[Stats](/stats)[Ecosystem](/ecosystem)[Token](https://skale.space/network/#token)

[

Developers

](/developers)

[Grants](https://skale.space/developers/#grants)[Validators](https://skale.space/developers/#validators)

[Blog](/blog)[Community](/community)[About](/about)

*   [](#)
*   [](#)
*   [](#)
*   [](#)

Menu

[Home](/)

[

Network

](https://skale.space/network)

[Stats](https://skale.space/stats)[Ecosystem](/ecosystem)[Token](https://skale.space/network/#token)

[

Developers

](https://skale.space/developers)

[Grants](https://skale.space/developers/#grants)[Validators](https://skale.space/developers/#validators)

[Blog](/blog)[Community](/community)[About](/about)

*   [](https://twitter.com/SkaleNetwork)
*   [](http://skale.chat/)
*   [](https://github.com/skalenetwork)

*   [

    ](https://form.typeform.com/to/sd38Fy?utm_source=website)
*   [](https://twitter.com/SkaleNetwork)
*   [](https://discord.com/invite/gM5XBy6)
*   [](https://github.com/skalenetwork)

[

Announcements

](/tags/announcements)

/

June 1, 2023

Introducing the Levitation Protocol: SKALE's Solution for Decentralized Zero Knowledge Proofs
=============================================================================================

SKALE Network

In an effort to further the innovation and breadth of the SKALE Network, the community developers working and contributing to the SKALE Network have pushed forth an open-source effort that will empower SKALE with a flexible and configurable suite of ZK scaling solutions. 

Today SKALE developers announced a SKALE Improvement Proposal, named the Levitation Protocol, a fully-decentralized ZK scaling solution designed to revolutionize the world of zero-knowledge proofs by enabling a full host of ZK solutions to connect seamlessly into the SKALE Architecture with rollup connectivity to the Ethereum Mainnet. 

The proposal includes a further ecosystem upgrade with the addition of a new "Layer 1 Megachain" called SKALE G (G for Ganymede, the largest moon in the solar system) fortified by ZK Rollups. The Levitation Protocol will empower developers and businesses to take their decentralized applications to new heights.

The Levitation Protocol is designed to enhance the capabilities of the SKALE ecosystem, offering any operator of Zero Knowledge Proofs the opportunity to provide a decentralized ZK solution to application developers through a SKALE Chain. This new offering will give developers building on SKALE even more flexibility in configuring their applications within SKALE’s robust app-chain network, which already consists of over 20 EVM blockchains.

### **SKALE’s Novel Approach to ZK Proofs**

The SKALE community is particularly optimistic about the launch of SKALE G (G for Ganymede, the largest moon in the solar system) which is set to become the world's fastest and most scalable decentralized Layer 1 blockchain. SKALE G will feature L2 ZK hooks back to Ethereum, enabling developers to harness the power of this cutting-edge technology while maintaining a seamless connection to the Ethereum network. Additionally, the proposal plans to enable App-Chains within the SKALE ecosystem to leverage both fast, gas-free transactions on SKALE or opt to use L2 ZK solutions in a configurable manner. 

SKALE Labs CEO and co-founder, Jack O'Holleran, emphasized the collaborative nature of the SKALE community in shaping the future of our network: "SKALE's community of developers is incredibly involved in not only running the network but also shaping the network's future, which was shown in the outpouring of contribution and community design of this initiative. The Levitation Protocol will take SKALE to the next level, offering even more options for developers and businesses to build and scale their decentralized applications. We're excited to see the impact Levitation will have on the future of the blockchain industry."

SKALE’s established network of Dapps and app-chains sets it apart from other ZK solutions. [With over 70 million on-chain transactions](https://skale.space/stats) completed and a native integration capacity for best-in-class ZK EVM solutions, SKALE offers developers a proven and reliable platform to build their decentralized applications. 

The Levitation Protocol propels SKALE forward as a comprehensive blockchain scalability platform, providing app-specific chains, Layer 1, and Layer 2 options.

### **Levitation vs. Other ZK Protocols** 

The current options for ZK protocols are centralized. Levitation protocol is different as it will implement a decentralized sequencer as a set of smart contracts deployed to a SKALE Chain. The sequencer protocol has pluggable modular architecture which enables existing ZKRs to run seamlessly on SKALE Chains that have chosen to implement the Levitation protocol.

Here are the three main advantages of Levitation:

1.  Decentralization: Existing ZKRs, when executed on Levitation, become decentralized, without requiring any modifications to the underlying software.
2.  Interoperability and Modularity: Levitation turns existing ZKRs into modules that interact with each other seamlessly.
3.  Common security: Multiple ZKRs can run in a common environment of a single Levitation-enabled chain. This enables a common ledger of transactions and eases the interaction of rollups.

### **Scaling Ethereum Together**

Chris Sharp, the CTO of Blockdaemon, a major Validator of the SKALE Network, highlighted the significance of SKALE's technological prowess and active developer community: "By marrying SKALE's instant finality to the added security of a novel layer 2 ZK approach, SKALE offers developers a platform for building new, decentralized applications. Not only will they be able to use app-specific chains, but also ZK roll-ups, and SKALE-G, an innovation that we are excited to see grow the blockchain ecosystem."

SKALE’s open-source developer community, known as the "SKALE\_Dev\_DAO," [has proposed the protocol addition through the SKALE developer forum](https://forum.skale.network/t/exciting-levitation-protocol-research-paper/461). The devs plan to start releasing source code in the coming months and will later launch a public testnet. Mainnet is slated to launch in Q4 2023, marking a significant milestone in the advancement of SKALE's capabilities. All timelines are subject to alignment and execution by open-source contributors to the SKALE Project. The core team will support and facilitate the development, but the timelines, spec, and delivery will be governed by devs, stakers, and community members within the SKALEverse. Ultimately a successful on-chain vote will be to push the source code proposal into live production. 

The Levitation Protocol represents a significant leap forward in the world of decentralized scaling solutions. This innovative protocol will empower developers and businesses to unlock the full potential of decentralized applications. Stay tuned for more updates from SKALE as we continue to revolutionize the blockchain industry together.

[Read the full press release here.](https://www.prweb.com/releases/skale_announces_the_levitation_protocol_a_web3_gateway_for_decentralized_zero_knowledge_proofs/prweb19364286.htm)

### Levitation and SKALE G Technical Details:

[Levitation Protocol Summary of Ideas](https://hackmd.io/ulwGK0HPTNqWxhLlJv6Zdg?view)

[Ganymede (SKALE G) Protocol Summary of Ideas](https://hackmd.io/@kladko/Sk2j0s0Nn)

### About SKALE

SKALE is the world's fastest blockchain, designed for fast, secure, user-centric Ethereum scaling. SKALE chains offer zero gas fees to end-users and have advanced features such as on-chain file storage, interchain messaging, zero-cost minting, ML/AI smart contracts, and enhanced security features. 

The SKALE network enables developers to deploy their own EVM blockchain in minutes without sacrificing speed, security, or decentralization. Welcome to the SKALEverse.

### More Information on SKALE:

[Deploying a Dapp on SKALE](https://docs.skale.network/)

[Read SKALE Primer](https://skale.space/primer)

[Learn more about the SKALE $SKL Token](https://skale.network/token/)

[The World’s Fastest Blockchain Network](https://skale.space/blog/the-quest-for-the-best-blockchain-performance-results-from-dartmouth-blockchain-study)

More From SKALE
---------------

[

July 7, 2023

#### SKALE Network Boosts Performance in Latest Q2 Engineering Updates

SKALE Q2 Engineering updates include Metaport Bridge release, upgraded contracts, V2.2 progress, DappRadar integration, and more.





](/blog/skale-network-boosts-performance-in-latest-q2-engineering-updates-)

[

April 24, 2023

#### Tune into SKALE's Upcoming April Community AMA

Get your questions answered by SKALE Labs Team, in April's Community AMA. Join us on April 27th at 11am PT. Submit your questions and RSVP now!





](/blog/tune-into-skales-upcoming-april-community-ama)

[

April 21, 2023

#### Watch ZK for the Impatient Episode 5: Polynomial Commitment

Learn more about polynomial commitment in ZK Proofs with SKALE Labs CTO Stan Kladko. Watch the final episode of the mini-series now!





](/blog/watch-zk-for-the-impatient-episode-5-polynomial-commitment)

Build on SKALE
--------------

The SKALE Innovator Program for developers includes grants, consulting, Marketing & PR, engineering support, QA support, and investor introductions.

[Apply to the Innovator Program](https://form.typeform.com/to/q91LBl?utm_source=website)

*   [](https://github.com/skalenetwork)
*   [](https://discord.com/invite/gM5XBy6)
*   [](https://twitter.com/SkaleNetwork)
*   [](https://form.typeform.com/to/sd38Fy?utm_source=website)

##### Subscribe to the SKALE newsletter

Thank you! Your submission has been received!

Oops! Something went wrong while submitting the form.

###### © 2018–2023 N.O.D.E. Anstalt

[

###### Network

](/network)[

###### Stats

](/stats)[

###### Developers

](/developers)[

###### Blog

](https://skale.network/blog/)[

###### Community

](/community)[

###### About

](/about)[

###### Security

](https://skale.space/security)

`
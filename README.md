# meson.to

The blockchain world has entered a period of multi-chain coexistence. For web3 app developers, they often encounter a problem: they need to deploy smart contracts on a specific chain, but this will greatly limit them to attract assets and users on other chains.

[meson.to](https://meson.to) has provided a solution for those web3 developers. [Meson](https://meson.fi) is a safe, costless and instant cross-chain protocol for stablecoins. meson.to is an integratable sdk supported meson cross-chain protocol. With meson.to, web3 applications can allow their users to transfer stablecoins from any chain directly to their smart contracts.

Get a feel for how meson.to works with this [demo](https://demo.meson.to).

## How to integrate meson.to

### Frontend

#### React

Add the npm package `@mesonfi/to` to your frontend project through `npm i -S @mesonfi/to` or `yarn add @mesonfi/to`. Then integrate it to your frontend project 

```js
import { MesonToButton } from '@mesonfi/to'

export default function App () {
  const onCompleted = data => {
    // when a cross-chain transfer is successful
    console.log(data)
  }

  return <MesonToButton appId='demo' onCompleted={onCompleted} />
}
```

If you want to customize the button, use
```js
// Customized button text
function ButtonText ({ pending }) {
  return pending ? 'Waiting for meson' : 'Deposit with meson'
}

export default function App () {
  return (
    <MesonToButton
      appId='demo'
      onCompleted={data => {}}
      className='btn-meson-to' // add a class name to customize styles
    >
      <ButtonText />
    </MesonToButton>
  )
}
```

See a complete example at https://github.com/MesonFi/meson-to-demo.

#### Plain JavaScript

If you use a package manager for your frontend project and want to call meson.to with plain JavaScript, import the global `MesonTo` class

```js
import MesonTo from '@mesonfi/to'
```

To open the popup of MesonTo for cross-chain transfer, run

```js
const appId = 'demo'
const meson2 = new MesonTo(window, {
  onCompleted: data => {
    // when a cross-chain transfer is successful
    console.log(data)
  }
})

meson2.open(appId)
  .then(() => {
    // on popup closed; doesn't mean a cross-chain transfer is completed
  })
```

See the example project in `examples/plain`.

#### Use with `<script>`

You can also add meson.to directly to the html file

```html
<script src="https://raw.githubusercontent.com/MesonFi/meson-to/main/dist/meson-to.js"></script>
```

Once the script is loaded, you will be able to use `MesonTo` globally.

### Smart contract

The cross-chain'ed stablecoin will be transferred to the app contract from meson's contract. In order to accept the transfer correctly, your app contract needs to implement the `depositWithBeneficiary` method.

```solidity
function depositWithBeneficiary(address token, uint256 amount, address beneficiary, uint64 data) external returns (bool);
```

This will allow the app contract to obtain depositing tokens from meson's contract, but transfer the corresponding benefits (purchased NFTs, exchanged tokens, etc) to the user's address.

See an example in `contracts/SampleAppContract.sol`.

## Submit app information

In order to keep users' funds safe, we need to confirm that your contract has correctly supported `depositWithBeneficiary`. Otherwise, users' cross-chain assets may be stuck and cannot be withdrawn.

Once `depositWithBeneficiary` is supported, you can [contact us]() to register your app. Please have the following information ready

- App name
- Prefered appId (popup will open at https://meson.to/{appId})
- App URL (need to open the popup from this URL in *release* mode)
- App icon (w144 x h144)
- App logo (height 144, width <= 1080)
- Smart contract info (deployed chain, supported types of stablecoins, contract address)
- A short paragraph informs the user of the effect of the cross-chain transfer and guides the user to complete the operation

We will review and input your app's information within 24 hours. After that, you can use `meson2.open(yourAppId)` to finish cross-chain transfers for your own app!

## Dev mode & release mode

In dev mode, meson.to popup can be opened from any hostname, but it only allows cross-chain transfers under $5. Note that dev mode also runs on mainnet.

After the app is launched, please switch to release mode. In release mode, meson.to can only be opened from your app URL.

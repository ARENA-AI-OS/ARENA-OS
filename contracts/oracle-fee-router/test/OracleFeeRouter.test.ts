import { expect } from "chai";
import { ethers } from "hardhat";
import type { OracleFeeRouter, MockERC20 } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("OracleFeeRouter", () => {
  let router: OracleFeeRouter;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let depositor: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, treasury, depositor, recipient, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy();

    const Router = await ethers.getContractFactory("OracleFeeRouter");
    router = await Router.deploy(treasury.address);

    await token.transfer(depositor.address, ethers.parseEther("1000"));
  });

  const intentId = (label: string) => ethers.keccak256(ethers.toUtf8Bytes(label));

  describe("createIntent", () => {
    it("stores the intent and marks it as this depositor's open intent", async () => {
      const id = intentId("proposal-1");
      await router.connect(depositor).createIntent(id, recipient.address, 50);

      const intent = await router.intents(id);
      expect(intent.depositor).to.equal(depositor.address);
      expect(intent.recipient).to.equal(recipient.address);
      expect(intent.feeBps).to.equal(50n);
      expect(intent.settled).to.equal(false);
      expect(await router.openIntentOf(depositor.address)).to.equal(id);
    });

    it("rejects a fee above the 10% hard cap regardless of what's requested", async () => {
      const id = intentId("too-greedy");
      await expect(router.connect(depositor).createIntent(id, recipient.address, 1001)).to.be.revertedWithCustomError(
        router,
        "FeeTooHigh",
      );
    });

    it("rejects a zero-address recipient", async () => {
      const id = intentId("bad-recipient");
      await expect(router.connect(depositor).createIntent(id, ethers.ZeroAddress, 50)).to.be.revertedWithCustomError(
        router,
        "ZeroAddress",
      );
    });

    it("rejects creating a second intent while one is still open", async () => {
      await router.connect(depositor).createIntent(intentId("first"), recipient.address, 50);
      await expect(
        router.connect(depositor).createIntent(intentId("second"), recipient.address, 50),
      ).to.be.revertedWithCustomError(router, "IntentAlreadyOpen");
    });

    it("allows a new intent once the previous one is settled", async () => {
      const first = intentId("first-then-settle");
      await router.connect(depositor).createIntent(first, recipient.address, 50);
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("100"));
      await router.settle(first, await token.getAddress());

      const second = intentId("second-after-settle");
      await expect(router.connect(depositor).createIntent(second, recipient.address, 50)).to.not.be.reverted;
      expect(await router.openIntentOf(depositor.address)).to.equal(second);
    });
  });

  describe("cancelIntent", () => {
    it("lets the depositor free up their slot without moving funds", async () => {
      const id = intentId("to-cancel");
      await router.connect(depositor).createIntent(id, recipient.address, 50);
      await router.connect(depositor).cancelIntent(id);

      expect(await router.openIntentOf(depositor.address)).to.equal(ethers.ZeroHash);
      const second = intentId("after-cancel");
      await expect(router.connect(depositor).createIntent(second, recipient.address, 50)).to.not.be.reverted;
    });

    it("rejects cancellation by anyone other than the depositor", async () => {
      const id = intentId("not-yours");
      await router.connect(depositor).createIntent(id, recipient.address, 50);
      await expect(router.connect(other).cancelIntent(id)).to.be.revertedWithCustomError(router, "NotIntentOwner");
    });

    it("rejects cancelling an already-settled intent", async () => {
      const id = intentId("already-settled");
      await router.connect(depositor).createIntent(id, recipient.address, 50);
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("100"));
      await router.settle(id, await token.getAddress());
      await expect(router.connect(depositor).cancelIntent(id)).to.be.revertedWithCustomError(router, "IntentAlreadySettled");
    });
  });

  describe("settle", () => {
    it("splits the deposited balance between recipient and treasury at the intent's fee rate", async () => {
      const id = intentId("happy-path");
      await router.connect(depositor).createIntent(id, recipient.address, 50); // 0.5%
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("1000"));

      const recipientBefore = await token.balanceOf(recipient.address);
      const treasuryBefore = await token.balanceOf(treasury.address);

      await expect(router.settle(id, await token.getAddress()))
        .to.emit(router, "IntentSettled")
        .withArgs(id, await token.getAddress(), ethers.parseEther("1000"), ethers.parseEther("995"), ethers.parseEther("5"));

      expect(await token.balanceOf(recipient.address)).to.equal(recipientBefore + ethers.parseEther("995"));
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + ethers.parseEther("5"));
      expect(await token.balanceOf(await router.getAddress())).to.equal(0n);
    });

    it("is permissionless — anyone can trigger settlement once funds have landed", async () => {
      const id = intentId("anyone-can-settle");
      await router.connect(depositor).createIntent(id, recipient.address, 100);
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("500"));

      await expect(router.connect(other).settle(id, await token.getAddress())).to.not.be.reverted;
    });

    it("rejects settling an unknown intent", async () => {
      await expect(router.settle(intentId("never-created"), await token.getAddress())).to.be.revertedWithCustomError(
        router,
        "IntentNotFound",
      );
    });

    it("rejects settling the same intent twice", async () => {
      const id = intentId("double-settle");
      await router.connect(depositor).createIntent(id, recipient.address, 50);
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("100"));
      await router.settle(id, await token.getAddress());

      await expect(router.settle(id, await token.getAddress())).to.be.revertedWithCustomError(router, "IntentAlreadySettled");
    });

    it("rejects settling with nothing deposited", async () => {
      const id = intentId("no-deposit");
      await router.connect(depositor).createIntent(id, recipient.address, 50);
      await expect(router.settle(id, await token.getAddress())).to.be.revertedWithCustomError(router, "NothingToSettle");
    });

    it("handles a zero fee cleanly (all funds to recipient, no dust transfer to treasury)", async () => {
      const id = intentId("zero-fee");
      await router.connect(depositor).createIntent(id, recipient.address, 0);
      await token.connect(depositor).transfer(await router.getAddress(), ethers.parseEther("42"));

      const treasuryBefore = await token.balanceOf(treasury.address);
      await router.settle(id, await token.getAddress());

      expect(await token.balanceOf(recipient.address)).to.equal(ethers.parseEther("42"));
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore);
    });
  });

  describe("setFeeTreasury", () => {
    it("lets the owner update the treasury address", async () => {
      await expect(router.connect(owner).setFeeTreasury(other.address))
        .to.emit(router, "FeeTreasuryUpdated")
        .withArgs(treasury.address, other.address);
      expect(await router.feeTreasury()).to.equal(other.address);
    });

    it("rejects updates from a non-owner", async () => {
      await expect(router.connect(depositor).setFeeTreasury(other.address)).to.be.revertedWithCustomError(
        router,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects the zero address", async () => {
      await expect(router.connect(owner).setFeeTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        router,
        "ZeroAddress",
      );
    });
  });
});

import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

/**
 * Split a configuration payload into BLE "blocks" and parse block answers.
 *
 * Port of the original Blocks factory:
 *  - payload <= 18 bytes  -> 1 block
 *  - payload > 18 bytes   -> ceil((len - 18) / 19) + 1 blocks
 *
 * The first block carries the command code; following blocks toggle the
 * chaining/toggle bits of the header byte.
 */
@Injectable()
export class BlocksService {
  constructor(private logger: LoggerService) {}

  /** Number of blocks needed to transmit `payload`. */
  getBlocksCount(payload: Uint8Array): number {
    if (payload.length <= 18) {
      return 1;
    }
    return Math.ceil((payload.length - 18) / 19) + 1;
  }

  /** Encode a payload + command code into the full sequence of blocks. */
  getBlocks(payload: Uint8Array, cmdCode: number): Uint8Array[] {
    this.logger.d('BlocksService.getBlocks()');
    const blocks: Uint8Array[] = [];
    const blocksCount = this.getBlocksCount(payload);

    // -------- First block -------------------------------------------
    const chaining = payload.length > 18;
    const firstCopyLength = chaining ? 18 : payload.length;
    const firstBlock = new Uint8Array(firstCopyLength + 2);
    firstBlock[0] = firstCopyLength + 1;
    if (chaining) {
      firstBlock[0] |= 0x20;
    }
    firstBlock[1] = cmdCode;
    for (let i = 0; i < firstCopyLength; i++) {
      firstBlock[2 + i] = payload[i];
    }
    blocks.push(firstBlock);

    // -------- Following blocks --------------------------------------
    for (let currentBlock = 1; currentBlock < blocksCount; currentBlock++) {
      const copiedLength = 18 + ((currentBlock - 1) * 19);
      const dataLength = payload.length;
      const chained = (copiedLength + 19) <= dataLength;
      const bufferSize = (dataLength - copiedLength) > 19 ? 19 : (dataLength - copiedLength);

      const block = new Uint8Array(bufferSize + 1);
      block[0] = bufferSize;
      if (chained) {
        block[0] |= 0x20;
      }
      // Toggle bit alternates on each additional block.
      if (currentBlock % 2 === 0) {
        block[0] |= 0x40;
      }
      // First data byte marker.
      block[0] |= 0x80;

      for (let i = 0; i < bufferSize; i++) {
        block[1 + i] = payload[copiedLength + i];
      }
      blocks.push(block);
    }

    return blocks;
  }

  // ------------------------------------------------------------------
  // Decoding side (used to interpret configuration answers)
  // ------------------------------------------------------------------

  /** True when `payload` is an answer starting with a first block. */
  isFirstBlock(payload: Uint8Array): boolean {
    return payload.length > 0 && (payload[0] & 0xc0) === 0;
  }

  /** True when this is the last block of an answer. */
  isLastBlock(payload: Uint8Array): boolean {
    return payload.length === 0 || (payload[0] & 0x20) === 0;
  }

  /** True when the block indicates more chained blocks follow. */
  isChained(payload: Uint8Array): boolean {
    return payload.length > 0 && (payload[0] & 0x20) !== 0;
  }

  /** True when the block carries data to read. */
  hasData(payload: Uint8Array): boolean {
    return payload.length > 0 && (payload[0] & 0x31) > 1;
  }

  /** Return the data part of a block (skipping the 2-byte header). */
  getData(payload: Uint8Array): Uint8Array {
    if (payload.length < 3) {
      return new Uint8Array();
    }
    return payload.slice(2, payload.length);
  }

  /** Status field of an answer block (byte 1). */
  getStatus(payload: Uint8Array): number {
    return payload.length > 1 ? payload[1] : 0x00;
  }

  /**
   * Indicate if the answer to a configuration command is a success.
   * An answer is a success when it starts with a first block and its status
   * field is 0x00.
   */
  isConfigurationAnswerSuccessful(answer: Uint8Array): boolean {
    if (answer.length < 3) {
      return false;
    }
    return this.isFirstBlock(answer) && this.getStatus(answer) === 0x00;
  }
}
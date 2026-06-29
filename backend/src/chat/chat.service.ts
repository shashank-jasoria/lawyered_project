import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Will } from '../wills/entities/will.entity';
import { Beneficiary } from '../wills/entities/beneficiary.entity';
import { Asset } from '../wills/entities/asset.entity';
import { AssetShare } from '../wills/entities/asset-share.entity';
import { ConversationMessage } from '../wills/entities/conversation-message.entity';
import { MockAiService } from './mock-ai.service';
import { HttpException, HttpStatus } from '@nestjs/common';

// Shape of the structured state we send to the AI
interface WillState {
  person_name?: string;
  person_age?: number;
  person_address?: string;
  sound_mind?: boolean;
  has_minor_children?: boolean; 
  revocation_line?: string;
  assets: AssetState[];
  beneficiaries: BeneficiaryState[];
  executor?: { name: string; id: string };
  guardian?: { name: string; id: string };
  witnesses: { name: string; id: string }[];
  missing_fields: string[];
}

interface AssetState {
  id: string;
  description: string;
  type: string;
  shares: { beneficiary_id: string; beneficiary_name: string; percentage: number }[];
}

interface BeneficiaryState {
  id: string;
  full_name: string;
  relationship: string;
  is_witness: boolean;
  type: string;
}

// The expected structure of the JSON the AI returns
interface AIUpdate {
  conversational_reply: string;
  updates: any[]; // we'll define the actions later
  next_question?: string; // optional
}

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ChatService.name);
  private readonly model = 'gpt-4o-mini'; // cost-effective, capable

  constructor(
    @InjectRepository(Will)
    private willRepo: Repository<Will>,
    @InjectRepository(Beneficiary)
    private beneficiaryRepo: Repository<Beneficiary>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(AssetShare)
    private assetShareRepo: Repository<AssetShare>,
    @InjectRepository(ConversationMessage)
    private messageRepo: Repository<ConversationMessage>,
    private mockAiService: MockAiService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

async handleMessage(willId: string, userId: string, userMessage: string) {
    // 1. Load the will and all related data
    const will = await this.willRepo.findOne({
      where: { id: willId, user_id: userId },
      relations: ['beneficiaries', 'assets', 'assets.asset_shares', 'assets.asset_shares.beneficiary'],
    });
    if (!will) {
      throw new HttpException('Will not found or access denied', HttpStatus.NOT_FOUND);
    }

    // 2. Build a tidy structured summary of the current state
    const state = this.buildWillState(will);

    // 3. Get recent conversation history (last 4 messages)
    const recentMessages = await this.messageRepo.find({
      where: { will_id: willId },
      order: { created_at: 'ASC' },
      take: 4,
    });

    let conversationalText: string;
    let updates: any[] = [];

    // 4. Try real OpenAI, fall back to mock
    try {
      const systemPrompt = this.buildSystemPrompt(state);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.2,
        max_tokens: 800,
      });

      const assistantReply = completion.choices[0].message.content;
      this.logger.log(`AI reply: ${assistantReply.slice(0, 100)}...`);

      // 5. Parse the JSON block from the reply
      const { conversationalText: convText, updateJson } = this.extractJsonFromReply(assistantReply);
      conversationalText = convText;
      updates = updateJson?.updates || [];

    } catch (error) {
      this.logger.warn('OpenAI call failed, using mock AI', error.message);
      // 6. Use mock AI
      const mockResponse = await this.mockAiService.generateResponse(state, userMessage);
      conversationalText = mockResponse.conversational_reply;
      updates = mockResponse.updates || [];
    }

    // 7. Apply the updates to the database
    if (updates.length > 0) {
      try {
        await this.applyUpdates(will, { updates });
      } catch (err) {
        this.logger.error('Failed to apply AI updates', err);
      }
    }

    // 8. Save the conversation messages
    await this.messageRepo.save([
      { will_id: willId, role: 'user', content: userMessage, structured_data_snapshot: state },
      { will_id: willId, role: 'assistant', content: conversationalText, structured_data_snapshot: state },
    ]);

    // 9. Determine if the will is now complete, and what's missing
    const updatedWill = await this.willRepo.findOne({
      where: { id: willId },
      relations: [
        'beneficiaries',
        'assets',
        'assets.asset_shares',
        'assets.asset_shares.beneficiary',
        'executor',
        'guardian',
      ],
    });
    const updatedState = this.buildWillState(updatedWill);

    // 10. Return the reply and updated state info to the frontend
    return {
      reply: conversationalText,
      missing_fields: updatedState.missing_fields,
      is_complete: updatedState.missing_fields.length === 0,
    };
}
  // Build a compact structured representation of the will
  private buildWillState(will: Will): WillState {
    const beneficiaries: BeneficiaryState[] = will.beneficiaries?.map(b => ({
        id: b.id,
        full_name: b.full_name,
        relationship: b.relationship,
        is_witness: b.is_witness,
        type: b.type,
    })) || [];

    const assets: AssetState[] = will.assets?.map(a => ({
      id: a.id,
      description: a.description,
      type: a.type,
      shares: a.asset_shares?.map(s => ({
        beneficiary_id: s.beneficiary_id,
        beneficiary_name: s.beneficiary?.full_name || '',
        percentage: s.share_percentage,
      })) || [],
    })) || [];

    const executor = beneficiaries.find(b => b.id === will.executor_id,);

    const guardian = will.guardian ? {
      id: will.guardian.id,
      full_name: will.guardian.full_name,
    }
  : undefined;

    const witnesses = beneficiaries
      .filter(b => b.is_witness)
      .map(b => ({ name: b.full_name, id: b.id }));

    // Determine missing required fields
    this.logger.log('===== BUILD STATE =====');
    this.logger.log('executor_id: ' + will.executor_id);
    this.logger.log('executor relation:');
    console.log(will);
    this.logger.log('beneficiaries count: ' + beneficiaries.length);
    const missing: string[] = [];
    if (!will.person_name) missing.push('person_name');
    if (!will.person_age) missing.push('person_age');
    if (!will.person_address) missing.push('person_address');
    if (will.sound_mind == null) missing.push('sound_mind');
    if (!will.executor_id) missing.push('executor');
    this.logger.log('Missing fields:');
    console.log(missing);
    // Guardian required only if children under 18 – we'll handle later
    if (assets.length === 0) missing.push('at least one asset');
    if (beneficiaries.filter(b => b.type === 'beneficiary').length === 0) missing.push('at least one beneficiary');
    if (witnesses.length < 2) missing.push('two witnesses');

    // Check share sums per asset
    for (const asset of assets) {
      console.log(asset);
      const total = asset.shares.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.abs(total - 100) > 0.01) {
        missing.push(`shares for '${asset.description}' do not sum to 100%`);
      }
    }

    return {
      person_name: will.person_name,
      person_age: will.person_age,
      person_address: will.person_address,
      sound_mind: will.sound_mind,
      has_minor_children: will.has_minor_children, 
      revocation_line: will.revocation_line,
      assets,
      beneficiaries,
      executor: executor? {
        id: executor.id,
        name: executor.full_name,
      } : undefined,
      guardian: guardian ? { name: guardian.full_name, id: guardian.id } : undefined,
      witnesses,
      missing_fields: missing,
    };
  }

  private buildSystemPrompt(state: WillState): string {
    return `You are a kind, patient, and professional will-writing assistant. Your job is to interview the user, one question at a time, to collect all the information needed for a valid legal will.

## Current known facts (in JSON):
\`\`\`json
${JSON.stringify(state, null, 2)}
\`\`\`

## What's missing:
${state.missing_fields.map(f => `- ${f}`).join('\n')}

## Your task:
1. Ask the next sensible question to fill the first missing field, unless the user has just answered something else.
2. After the user's reply, you MUST output a JSON block (enclosed in \`\`\`json ... \`\`\`) that contains:
   - "conversational_reply": your friendly response to the user.
   - "updates": an array of actions that the backend should perform to update the database.

## Allowed update actions:
- { "action": "set_person_name", "value": "string" }
- { "action": "set_person_age", "value": number }
- { "action": "set_person_address", "value": "string" }
- { "action": "set_sound_mind", "value": true/false }
- { "action": "add_asset", "description": "...", "type": "real_estate|bank_account|vehicle|jewellery|other" }
- { "action": "add_beneficiary", "full_name": "...", "relationship": "..." }
- { "action": "add_executor", "beneficiary_name": "..." }  // must match an existing beneficiary's name
- { "action": "add_guardian", "beneficiary_name": "..." }
- { "action": "add_witness", "full_name": "...", "relationship": "..." }
- { "action": "add_asset_share", "asset_description": "...", "beneficiary_name": "...", "percentage": number }
- { "action": "remove_asset_share", "asset_description": "...", "beneficiary_name": "..." }
- { "action": "update_asset_share", "asset_description": "...", "beneficiary_name": "...", "percentage": number }

## Important rules:
- If the user changes their mind (e.g., "actually, make my brother the executor"), use the appropriate update to reflect that.
- If two beneficiaries have the same name, ask for clarification before adding them.
- If shares for an asset don't sum to 100%, ask the user to correct it.
- Always keep the conversation friendly and simple. Use plain language.
- Do not include any other text outside the JSON block after your conversational reply. The JSON must be valid.
- If no update is needed (e.g., the user just said "ok"), you may omit the "updates" array or leave it empty.

Now, begin by asking the first missing question (or responding to the user's latest message).`;
  }

  // Extract the conversational text and the JSON block from the AI's reply
  private extractJsonFromReply(reply: string): { conversationalText: string; updateJson: any } {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = reply.match(jsonRegex);
    let conversationalText = reply;
    let updateJson = null;

    if (match) {
      // Remove the JSON block from the conversational part
      conversationalText = reply.replace(jsonRegex, '').trim();
      try {
        updateJson = JSON.parse(match[1]);
      } catch (e) {
        this.logger.error('Failed to parse AI JSON', e);
      }
    } else {
      // No JSON found; we just treat the whole reply as conversational.
      // The AI might have not returned updates (e.g., if no change).
    }

    return { conversationalText, updateJson };
  }

  // Apply the array of updates to the database
  private async applyUpdates(will: Will, updateJson: any) {
    const updates = updateJson.updates || [];
    for (const update of updates) {
      await this.applySingleUpdate(will, update);
    }
  }
  private async applySingleUpdate(will: Will, update: any) {
  switch (update.action) {
    case 'set_person_name':
      will.person_name = update.value;
      await this.willRepo.save(will);
      break;
    case 'set_person_age':
      will.person_age = update.value;
      await this.willRepo.save(will);
      break;
    case 'set_person_address':
      will.person_address = update.value;
      await this.willRepo.save(will);
      break;
    case 'set_sound_mind':
      will.sound_mind = update.value;
      await this.willRepo.save(will);
      break;
    case 'set_has_minor_children':
      will.has_minor_children = update.value;
      await this.willRepo.save(will);
      break;

    case 'add_asset': {
      const asset = this.assetRepo.create({
        will: will,               // relation object, NOT will_id
        description: update.description,
        type: update.type || 'other',
      });
      await this.assetRepo.save(asset);
      break;
    }

    case 'add_beneficiary': {
      const beneficiary = this.beneficiaryRepo.create({
        will: will,               // crucial – sets will_id automatically
        full_name: update.full_name,
        relationship: update.relationship,
        type: 'beneficiary',
      });
      await this.beneficiaryRepo.save(beneficiary);
      break;
    }
    case 'add_executor': {
  const executor = this.beneficiaryRepo.create({
    will,
    full_name: update.full_name,
    relationship: 'executor',
    is_executor: true,
    type: 'executor',
    });
    await this.beneficiaryRepo.save(executor);

  // Directly update the will's FK column
    await this.willRepo.update(will.id, { executor_id: executor.id });
    break;
  }

  case 'add_guardian': {
    const guardian = this.beneficiaryRepo.create({
      will,
      full_name: update.full_name,
      relationship: 'guardian',
      is_guardian: true,
      type: 'guardian',
    });
    await this.beneficiaryRepo.save(guardian);
    console.log('Guardian savedssssssssssssssssssssssssssssssssssssssssssssss:', guardian);

    // Direct FK update – foolproof
    await this.willRepo.update(will.id, { guardian_id: guardian.id });
    break;
  }

    case 'add_witness': {
      const witness = this.beneficiaryRepo.create({
        will: will,
        full_name: update.full_name,
        relationship: update.relationship || 'friend',
        is_witness: true,
        type: 'witness',
      });
      await this.beneficiaryRepo.save(witness);
      break;
    }

    case 'add_asset_share': {
      const asset = await this.assetRepo.findOne({
        where: { will: { id: will.id }, description: update.asset_description },
      });
      const beneficiary = await this.beneficiaryRepo.findOne({
        where: { will: { id: will.id }, full_name: update.beneficiary_name },
      });
      if (asset && beneficiary) {
        const share = this.assetShareRepo.create({
          asset: asset,
          beneficiary: beneficiary,
          share_percentage: update.percentage,
        });
        await this.assetShareRepo.save(share);
      }
      break;
    }

    case 'remove_asset_share': {
      const asset = await this.assetRepo.findOne({
        where: { will: { id: will.id }, description: update.asset_description },
      });
      const beneficiary = await this.beneficiaryRepo.findOne({
        where: { will: { id: will.id }, full_name: update.beneficiary_name },
      });
      if (asset && beneficiary) {
        await this.assetShareRepo.delete({
          asset: { id: asset.id },
          beneficiary: { id: beneficiary.id },
        });
      }
      break;
    }

    case 'update_asset_share': {
      const asset = await this.assetRepo.findOne({
        where: { will: { id: will.id }, description: update.asset_description },
      });
      const beneficiary = await this.beneficiaryRepo.findOne({
        where: { will: { id: will.id }, full_name: update.beneficiary_name },
      });
      if (asset && beneficiary) {
        const share = await this.assetShareRepo.findOne({
          where: { asset: { id: asset.id }, beneficiary: { id: beneficiary.id } },
        });
        if (share) {
          share.share_percentage = update.percentage;
          await this.assetShareRepo.save(share);
        }
      }
      break;
    }

    default:
      this.logger.warn(`Unknown update action: ${update.action}`);
  }
}
}
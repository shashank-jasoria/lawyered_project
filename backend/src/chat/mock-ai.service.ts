import { Injectable, Logger } from '@nestjs/common';

interface WillState {
  missing_fields: string[];
  has_minor_children?: boolean;
  assets: any[];
  beneficiaries: any[];
  witnesses: any[];
  // ...other fields not needed for this mock
}

@Injectable()
export class MockAiService {
  private readonly logger = new Logger(MockAiService.name);

  async generateResponse(state: WillState, userMessage: string) {
    const msg = userMessage.trim();
    const lower = msg.toLowerCase();
    const missing = state.missing_fields;

    // 1. PERSON NAME
    if (missing.includes('person_name')) {
      const name = msg.replace(/[^a-zA-Z ]/g, '').trim();
      if (name && name.split(' ').length <= 5) {
        return { conversational_reply: `Nice to meet you, ${name}! How old are you?`, updates: [{ action: 'set_person_name', value: name }] };
      }
      return { conversational_reply: "Let's start with your full name.", updates: [] };
    }

    // 2. AGE
    if (missing.includes('person_age')) {
      const m = lower.match(/\b(\d{1,3})\b/);
      if (m) {
        const age = parseInt(m[1], 10);
        return { conversational_reply: `Got it, ${age}. And your full address?`, updates: [{ action: 'set_person_age', value: age }] };
      }
      return { conversational_reply: "What is your age? (just the number)", updates: [] };
    }

    // 3. ADDRESS
    if (missing.includes('person_address')) {
      return { conversational_reply: `Address noted. Are you of sound mind? (yes/no)`, updates: [{ action: 'set_person_address', value: msg }] };
    }

    // 4. SOUND MIND
    if (missing.includes('sound_mind')) {
      if (lower.match(/\b(yes|yeah|yup|i am|sure)\b/)) {
        return { conversational_reply: "Great. What assets do you own? (e.g., 'a house in Pune')", updates: [{ action: 'set_sound_mind', value: true }] };
      } else if (lower.includes('no')) {
        return { conversational_reply: "I'm sorry, you must be of sound mind to create a will.", updates: [] };
      }
      return { conversational_reply: "Just yes or no – are you of sound mind?", updates: [] };
    }

    // 5. ASSETS
    if (missing.includes('at least one asset')) {
      if (lower.match(/\b(house|flat|apartment|land|car|bike|bank|fd|gold|jewellery|shares|plot|property)\b/)) {
        const desc = lower.replace(/i (have|own)|my|a |an |the /gi, '').trim();
        return { conversational_reply: `Added "${desc}". Who should inherit your assets? (e.g., 'my son')`, updates: [{ action: 'add_asset', description: desc, type: 'other' }] };
      }
      return { conversational_reply: "Tell me one asset you own, like 'a house'.", updates: [] };
    }

    // 6. BENEFICIARIES
    if (missing.includes('at least one beneficiary')) {
      const relMatch = lower.match(/\b(son|daughter|wife|husband|spouse|mother|father|brother|sister|friend)\b/);
      if (relMatch) {
        const rel = relMatch[1];
        return { conversational_reply: `I've added your ${rel} as a beneficiary. Who should be the executor?`, updates: [{ action: 'add_beneficiary', full_name: rel, relationship: rel }] };
      }
      return { conversational_reply: "Who is a beneficiary? (e.g., 'my son')", updates: [] };
    }

    // 7. EXECUTOR (now uses the reliable add_executor action)
    if (missing.includes('executor')) {
      // Ignore yes/no answers
      if (lower.match(/^(yes|no|yeah|nope)$/)) {
        return { conversational_reply: "I need a name for the executor. Who should carry out your will?", updates: [] };
      }
      const name = msg.replace(/^(make|appoint|my|the|executor|is|as)\s*/gi, '').trim() || 'Executor';
      return {
        conversational_reply: `I've set ${name} as executor. Write the name of your first witness`,
        updates: [{ action: 'add_executor', full_name: name }],
      };
    }

    // 8. MINOR CHILDREN
    if (state.has_minor_children === undefined || state.has_minor_children === null) {
      if (lower.match(/\b(yes|yeah|yup)\b/)) {
        return {
          conversational_reply: "You'll need a guardian. Who should that be?",
          updates: [{ action: 'set_has_minor_children', value: true }],
        };
      } else if (lower.includes('no')) {
        return {
          conversational_reply: "Understood. Now let's add two witnesses. First witness?",
          updates: [{ action: 'set_has_minor_children', value: false }],
        };
      }
      return { conversational_reply: "Do you have children under 18? (yes/no)", updates: [] };
    }

    // 9. GUARDIAN (only if needed)
    if (missing.includes('guardian') && state.has_minor_children) {
      const name = msg.replace(/^(make|appoint|my|the|guardian|is|as)\s*/gi, '').trim() || 'Guardian';
      return {
        conversational_reply: `Guardian ${name} added. Now first witness?`,
        updates: [{ action: 'add_guardian', full_name: name }],
      };
    }

    // 10. WITNESSES
    if (missing.includes('two witnesses')) {
      const current = state.witnesses.length;
      const name = msg.replace(/^(witness|first|second|add|my|the|name)\s*/gi, '').trim() || `Witness ${current + 1}`;
      const updates = [{ action: 'add_witness', full_name: name, relationship: 'friend' }];
      if (current + 1 < 2) {
        return { conversational_reply: `Witness ${name} added. Second witness?`, updates };
      } else {
        return { conversational_reply: `Witness ${name} added. Let's split the assets equally.`, updates };
      }
    }

    // 11. SHARE ALLOCATION (auto split equally)
    const incompleteAssets = state.assets.filter((a: any) => {
      const total = (a.shares || []).reduce((s: number, sh: any) => s + sh.percentage, 0);
      return Math.abs(total - 100) > 0.01;
    });
    if (incompleteAssets.length > 0) {
      const asset = incompleteAssets[0];
      const benefs = state.beneficiaries.filter((b: any) => b.type === 'beneficiary');
      if (benefs.length > 0) {
        const equal = Math.floor(100 / benefs.length);
        const rem = 100 - equal * (benefs.length - 1);
        const updates = benefs.map((b, i) => ({
          action: 'add_asset_share' as const,
          asset_description: asset.description,
          beneficiary_name: b.full_name,
          percentage: i === 0 ? rem : equal,
        }));
        return { conversational_reply: `Divided "${asset.description}" equally among beneficiaries.`, updates };
      }
    }

    // Fallback
    if (missing.length > 0) {
      return { conversational_reply: `Now let's cover: ${missing[0].replace(/_/g, ' ')}.`, updates: [] };
    }

    return { conversational_reply: "Your will is complete! You can download it now.", updates: [] };
  }
}
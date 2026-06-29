import { Injectable } from '@nestjs/common';
import { Will } from './entities/will.entity';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  status: 'incomplete' | 'valid' | 'invalid';
  issues: ValidationIssue[];
}

@Injectable()
export class WillValidatorService {
  validate(will: Will): ValidationResult {
    const issues: ValidationIssue[] = [];

    // ---- 1. Required fields (incomplete if any missing)
    const requiredFields = [
      { key: 'person_name', label: 'Full name' },
      { key: 'person_age', label: 'Age' },
      { key: 'person_address', label: 'Address' },
    ];

    for (const { key, label } of requiredFields) {
      if (!will[key]) {
        issues.push({
          field: key,
          message: `${label} is required.`,
          severity: 'error',
        });
      }
    }

    if (will.sound_mind == null) {
      issues.push({
        field: 'sound_mind',
        message: 'You must confirm you are of sound mind.',
        severity: 'error',
      });
    }

    // At least one asset
    if (!will.assets || will.assets.length === 0) {
      issues.push({
        field: 'assets',
        message: 'You need at least one asset.',
        severity: 'error',
      });
    }

    // At least one beneficiary
    const beneficiaries = will.beneficiaries?.filter(b => b.type === 'beneficiary') || [];
    if (beneficiaries.length === 0) {
      issues.push({
        field: 'beneficiaries',
        message: 'You need at least one beneficiary.',
        severity: 'error',
      });
    }

    // Executor
    if (!will.executor_id) {
      issues.push({
        field: 'executor',
        message: 'An executor must be named.',
        severity: 'error',
      });
    }

    // Guardian if has minor children
    if (will.has_minor_children && !will.guardian_id) {
      issues.push({
        field: 'guardian',
        message: 'You have minor children – a guardian is required.',
        severity: 'error',
      });
    }

    // Witnesses: at least two
    const witnesses = will.beneficiaries?.filter(b => b.is_witness) || [];
    if (witnesses.length < 2) {
      issues.push({
        field: 'witnesses',
        message: 'At least two witnesses are required.',
        severity: 'error',
      });
    }

    // Shares of each asset must sum to 100%
    for (const asset of (will.assets || [])) {
      const shares = asset.asset_shares || [];
      const total = shares.reduce((sum, s) => sum + Number(s.share_percentage), 0);
      if (Math.abs(total - 100) > 0.01) {
        issues.push({
          field: `asset_${asset.id}`,
          message: `Shares for "${asset.description}" add up to ${total}%, not 100%.`,
          severity: 'error',
        });
      }
    }

    // Warning: witness is also a beneficiary
    for (const w of witnesses) {
      if (beneficiaries.some(b => b.id === w.id)) {
        issues.push({
          field: 'witnesses',
          message: `Witness "${w.full_name}" is also a beneficiary – this is allowed but not ideal.`,
          severity: 'warning',
        });
      }
    }

    // Determine overall status
    const hasErrors = issues.some(i => i.severity === 'error');
    if (hasErrors) {
      // If any required field is missing, it's incomplete; else invalid
      const isMissingRequired = issues.some(i =>
        ['person_name', 'person_age', 'person_address', 'sound_mind'].includes(i.field) && i.severity === 'error'
      );
      return {
        status: isMissingRequired ? 'incomplete' : 'invalid',
        issues,
      };
    }

    return { status: 'valid', issues };
  }
}
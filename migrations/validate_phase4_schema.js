#!/usr/bin/env node

/**
 * Phase 4 Intelligent Features - Schema Validation Script
 * Validates relationships, constraints, and indexes in the migration files
 */

const fs = require('fs');
const path = require('path');

// Migration files to validate
const migrationFiles = [
    '021_skill_taxonomy_enhancements.sql',
    '022_forecasting_tables.sql', 
    '023_optimization_tables.sql'
];

// Expected table relationships and foreign keys
const expectedRelationships = {
    // Skill Taxonomy (Migration 021)
    'skills': {
        references: ['skills(id)'], // self-reference for parent_skill_id
        referencedBy: [
            'skill_taxonomy_mapping(skill_id)',
            'skill_prerequisites(skill_id)',
            'skill_prerequisites(prerequisite_skill_id)',
            'skill_relationships(skill_a_id)',
            'skill_relationships(skill_b_id)',
            'project_skill_requirements(skill_id)',
            'competency_skill_mappings(skill_id)',
            'skill_market_data(skill_id)'
        ]
    },
    'skill_taxonomy': {
        references: ['skill_taxonomy(id)'], // self-reference for parent_id
        referencedBy: ['skill_taxonomy_mapping(taxonomy_id)']
    },
    'project_skill_requirements': {
        references: ['projects(id)', 'skills(id)'],
        referencedBy: []
    },
    'competency_frameworks': {
        references: [],
        referencedBy: [
            'competency_levels(framework_id)',
            'competency_skill_mappings(framework_id)'
        ]
    },
    'competency_levels': {
        references: ['competency_frameworks(id)'],
        referencedBy: ['competency_skill_mappings(level_id)']
    },

    // Forecasting (Migration 022)
    'resource_forecasts': {
        references: ['employees(id)'],
        referencedBy: ['scenario_forecasts(forecast_id)']
    },
    'demand_predictions': {
        references: ['projects(id)', 'employees(id)'],
        referencedBy: []
    },
    'capacity_forecasts': {
        references: ['employees(id)', 'departments(id)'],
        referencedBy: []
    },
    'forecast_scenarios': {
        references: ['employees(id)'],
        referencedBy: ['scenario_forecasts(scenario_id)']
    },

    // Optimization (Migration 023)
    'optimization_runs': {
        references: ['employees(id)'],
        referencedBy: ['optimization_solutions(run_id)']
    },
    'resource_conflicts': {
        references: ['projects(id)', 'employees(id)'],
        referencedBy: ['conflict_resolutions(conflict_id)']
    },
    'conflict_resolutions': {
        references: ['resource_conflicts(id)', 'employees(id)'],
        referencedBy: []
    },
    'optimization_recommendations': {
        references: ['employees(id)'],
        referencedBy: []
    }
};

// Required indexes for performance
const expectedIndexes = [
    // Skill Taxonomy indexes
    'idx_skills_hierarchy',
    'idx_skills_weight', 
    'idx_skills_demand',
    'idx_skill_taxonomy_path',
    'idx_skill_prerequisites_skill',
    'idx_skill_relationships_skills',
    'idx_project_requirements_project',
    'idx_competency_mappings_framework',

    // Forecasting indexes
    'idx_resource_forecasts_type_date',
    'idx_resource_forecasts_resource',
    'idx_resource_forecasts_target_date',
    'idx_historical_patterns_type',
    'idx_demand_predictions_project',
    'idx_capacity_forecasts_employee',

    // Optimization indexes
    'idx_optimization_runs_type',
    'idx_optimization_runs_status',
    'idx_conflicts_type_severity',
    'idx_conflicts_status',
    'idx_cost_analysis_resource',
    'idx_recommendations_priority'
];

// Validation functions
function validateFile(filename) {
    console.log(`\n=== Validating ${filename} ===`);
    
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filename}`);
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let isValid = true;

    // Check for basic SQL syntax patterns
    const sqlPatterns = {
        'CREATE TABLE': /CREATE TABLE.*?\(/gi,
        'FOREIGN KEY': /FOREIGN KEY.*?REFERENCES/gi, 
        'PRIMARY KEY': /PRIMARY KEY/gi,
        'CREATE INDEX': /CREATE INDEX/gi,
        'CHECK constraint': /CHECK\s*\(/gi,
        'NOT NULL': /NOT NULL/gi,
        'DEFAULT': /DEFAULT/gi
    };

    console.log('\n📊 SQL Pattern Analysis:');
    for (const [pattern, regex] of Object.entries(sqlPatterns)) {
        const matches = content.match(regex) || [];
        console.log(`  ${pattern}: ${matches.length} occurrences`);
    }

    // Validate foreign key references
    console.log('\n🔗 Foreign Key Validation:');
    const foreignKeyPattern = /FOREIGN KEY\s*\([^)]+\)\s*REFERENCES\s+([^(]+)\([^)]+\)/gi;
    const foreignKeys = [];
    let match;
    
    while ((match = foreignKeyPattern.exec(content)) !== null) {
        const referencedTable = match[1].trim();
        foreignKeys.push(referencedTable);
    }
    
    console.log(`  Found ${foreignKeys.length} foreign key references:`);
    foreignKeys.forEach(fk => console.log(`    - ${fk}`));

    // Check for required constraints
    console.log('\n✅ Constraint Validation:');
    const constraints = [
        'CHECK',
        'UNIQUE', 
        'NOT NULL',
        'PRIMARY KEY'
    ];
    
    constraints.forEach(constraint => {
        const regex = new RegExp(constraint, 'gi');
        const count = (content.match(regex) || []).length;
        console.log(`  ${constraint} constraints: ${count}`);
    });

    // Validate indexes specific to this file
    console.log('\n📇 Index Validation:');
    const fileIndexes = expectedIndexes.filter(idx => content.includes(idx));
    console.log(`  Expected indexes found: ${fileIndexes.length}`);
    fileIndexes.forEach(idx => console.log(`    ✓ ${idx}`));

    const missingIndexes = expectedIndexes.filter(idx => 
        content.includes(idx.replace('idx_', '').split('_')[0]) && !content.includes(idx)
    );
    if (missingIndexes.length > 0) {
        console.log(`  Missing indexes:`);
        missingIndexes.forEach(idx => console.log(`    ❌ ${idx}`));
        isValid = false;
    }

    // Check for triggers
    const triggerPattern = /CREATE TRIGGER/gi;
    const triggers = content.match(triggerPattern) || [];
    console.log(`\n🔄 Triggers: ${triggers.length} found`);

    // Check for views
    const viewPattern = /CREATE.*VIEW/gi;
    const views = content.match(viewPattern) || [];
    console.log(`📊 Views: ${views.length} found`);

    // Validate JSONB usage
    const jsonbPattern = /JSONB/gi;
    const jsonbColumns = content.match(jsonbPattern) || [];
    console.log(`📄 JSONB columns: ${jsonbColumns.length} found`);

    return isValid;
}

function validateSchemaIntegrity() {
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  PHASE 4 INTELLIGENT FEATURES SCHEMA VALIDATION');
    console.log('='.repeat(60));

    let overallValid = true;

    // Validate each migration file
    migrationFiles.forEach(file => {
        const fileValid = validateFile(file);
        overallValid = overallValid && fileValid;
    });

    // Cross-file relationship validation
    console.log('\n' + '='.repeat(60));
    console.log('🔗 CROSS-MIGRATION RELATIONSHIP ANALYSIS');
    console.log('='.repeat(60));

    // Read all files to check relationships
    const allContent = migrationFiles.map(file => {
        const filePath = path.join(__dirname, file);
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    }).join('\n\n');

    // Check for table creation
    const tablePattern = /CREATE TABLE.*?([a-zA-Z_]+)\s*\(/gi;
    const tables = [];
    let match;
    
    while ((match = tablePattern.exec(allContent)) !== null) {
        tables.push(match[1]);
    }

    console.log(`\n📋 Created Tables: ${tables.length}`);
    tables.forEach(table => console.log(`  • ${table}`));

    // Validate expected relationships exist
    console.log('\n🔍 Relationship Validation:');
    let relationshipErrors = 0;

    for (const [table, relationships] of Object.entries(expectedRelationships)) {
        if (allContent.includes(table)) {
            console.log(`\n  📊 ${table}:`);
            
            // Check outgoing references
            relationships.references.forEach(ref => {
                if (allContent.includes(`REFERENCES ${ref}`)) {
                    console.log(`    ✓ References ${ref}`);
                } else {
                    console.log(`    ❌ Missing reference to ${ref}`);
                    relationshipErrors++;
                }
            });

            console.log(`    Expected to be referenced by: ${relationships.referencedBy.length} tables`);
        }
    }

    // Performance analysis
    console.log('\n⚡ Performance Analysis:');
    const performanceMetrics = {
        'Time-based indexes': (allContent.match(/ON.*\(.*date.*\)/gi) || []).length,
        'Composite indexes': (allContent.match(/ON.*\(.*,.*\)/gi) || []).length,
        'Partial indexes': (allContent.match(/WHERE.*\)/gi) || []).length,
        'JSONB indexes': (allContent.match(/USING.*JSONB/gi) || []).length
    };

    for (const [metric, count] of Object.entries(performanceMetrics)) {
        console.log(`  ${metric}: ${count}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const summary = {
        'Migration files': migrationFiles.length,
        'Tables created': tables.length,
        'Relationship errors': relationshipErrors,
        'Overall status': overallValid && relationshipErrors === 0 ? '✅ VALID' : '❌ ISSUES FOUND'
    };

    for (const [key, value] of Object.entries(summary)) {
        console.log(`${key}: ${value}`);
    }

    if (overallValid && relationshipErrors === 0) {
        console.log('\n🎉 Schema validation completed successfully!');
        console.log('   All migrations are ready for deployment.');
    } else {
        console.log('\n⚠️  Schema validation found issues that should be addressed.');
    }

    return overallValid && relationshipErrors === 0;
}

// Run validation if called directly
if (require.main === module) {
    validateSchemaIntegrity();
}

module.exports = { validateSchemaIntegrity, validateFile };
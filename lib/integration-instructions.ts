// Integration instruction generation system
// Provides stakeholder-specific setup guidance and requirements for different integration types

import { Integration, Stakeholder } from './types';
import { IntegrationInstructions } from './integration-lifecycle';

/**
 * Integration instruction generator for different integration types and stakeholder roles
 */
export class IntegrationInstructionGenerator {

  /**
   * Generate SIS integration instructions
   */
  static generateSISInstructions(stakeholderRole: Stakeholder['role']): IntegrationInstructions {
    const baseInstructions: IntegrationInstructions = {
      integration_type: 'SIS',
      stakeholder_role: stakeholderRole,
      title: 'Student Information System (SIS) Integration Setup',
      description: 'Configure secure connection between your SIS and our platform for automated student data synchronization.',
      steps: [],
      requirements: {
        technical: [
          'SIS system with API access capabilities',
          'Network connectivity to external APIs',
          'SSL/TLS encryption support'
        ],
        access: [
          'SIS administrator privileges',
          'API key generation permissions',
          'Student data access rights'
        ],
        information: [
          'SIS API endpoint URL',
          'Authentication credentials',
          'Student data schema documentation'
        ]
      },
      estimated_time_hours: 4
    };

    // Customize steps based on stakeholder role
    switch (stakeholderRole) {
      case 'it_contact':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Verify SIS API Access',
            description: 'Confirm your SIS system supports API access and identify the correct endpoints.',
            required_info: ['SIS version', 'API documentation', 'Current integrations'],
            validation_criteria: ['API endpoints accessible', 'Documentation available']
          },
          {
            step_number: 2,
            title: 'Generate API Credentials',
            description: 'Create dedicated API credentials for the integration with appropriate permissions.',
            required_info: ['API key', 'Secret key', 'Permission scope'],
            validation_criteria: ['Credentials generated', 'Read access to student data confirmed']
          },
          {
            step_number: 3,
            title: 'Configure Network Access',
            description: 'Ensure network connectivity and firewall rules allow communication with our platform.',
            required_info: ['Firewall rules', 'IP whitelist', 'Port configurations'],
            validation_criteria: ['Network connectivity tested', 'SSL handshake successful']
          },
          {
            step_number: 4,
            title: 'Test Data Access',
            description: 'Verify the integration can access required student data fields.',
            required_info: ['Sample data export', 'Field mappings', 'Data format validation'],
            validation_criteria: ['Sample data retrieved', 'Required fields present', 'Data format valid']
          }
        ];
        baseInstructions.estimated_time_hours = 6;
        break;

      case 'technical_lead':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Review Integration Architecture',
            description: 'Analyze the technical requirements and integration architecture.',
            required_info: ['System architecture diagram', 'Data flow requirements', 'Security protocols'],
            validation_criteria: ['Architecture reviewed', 'Requirements understood']
          },
          {
            step_number: 2,
            title: 'Coordinate with IT Team',
            description: 'Work with IT contacts to ensure proper configuration and access.',
            required_info: ['IT contact information', 'Access requirements', 'Timeline coordination'],
            validation_criteria: ['IT team briefed', 'Access permissions confirmed']
          },
          {
            step_number: 3,
            title: 'Validate Integration Testing',
            description: 'Oversee integration testing and validate data accuracy.',
            required_info: ['Test results', 'Data validation reports', 'Performance metrics'],
            validation_criteria: ['Tests completed successfully', 'Data accuracy confirmed']
          }
        ];
        baseInstructions.estimated_time_hours = 3;
        break;

      case 'project_manager':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Coordinate Stakeholders',
            description: 'Ensure all necessary stakeholders are identified and engaged.',
            required_info: ['Stakeholder list', 'Contact information', 'Responsibility matrix'],
            validation_criteria: ['All stakeholders identified', 'Responsibilities assigned']
          },
          {
            step_number: 2,
            title: 'Track Integration Progress',
            description: 'Monitor setup progress and address any blockers or delays.',
            required_info: ['Progress updates', 'Blocker reports', 'Timeline status'],
            validation_criteria: ['Progress tracked', 'Issues escalated appropriately']
          },
          {
            step_number: 3,
            title: 'Validate Completion',
            description: 'Confirm integration is complete and ready for production use.',
            required_info: ['Completion checklist', 'Test results', 'Go-live approval'],
            validation_criteria: ['Integration tested', 'Stakeholder approval received']
          }
        ];
        baseInstructions.estimated_time_hours = 2;
        break;

      default: // owner
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Provide SIS Information',
            description: 'Share basic information about your Student Information System.',
            required_info: ['SIS vendor/name', 'Version information', 'IT contact details'],
            validation_criteria: ['SIS information provided', 'IT contact confirmed']
          },
          {
            step_number: 2,
            title: 'Approve Data Access',
            description: 'Review and approve the data that will be accessed through the integration.',
            required_info: ['Data access agreement', 'Privacy policy review', 'Approval signature'],
            validation_criteria: ['Data access approved', 'Privacy requirements understood']
          }
        ];
        baseInstructions.estimated_time_hours = 1;
    }

    return baseInstructions;
  }

  /**
   * Generate CRM integration instructions
   */
  static generateCRMInstructions(stakeholderRole: Stakeholder['role']): IntegrationInstructions {
    const baseInstructions: IntegrationInstructions = {
      integration_type: 'CRM',
      stakeholder_role: stakeholderRole,
      title: 'Customer Relationship Management (CRM) Integration Setup',
      description: 'Connect your CRM system to synchronize customer data and track engagement metrics.',
      steps: [],
      requirements: {
        technical: [
          'CRM system with API support (Salesforce, HubSpot, etc.)',
          'OAuth 2.0 authentication capability',
          'Custom field configuration access'
        ],
        access: [
          'CRM administrator privileges',
          'API access permissions',
          'Custom field creation rights'
        ],
        information: [
          'CRM instance URL',
          'OAuth credentials',
          'Field mapping requirements'
        ]
      },
      estimated_time_hours: 3
    };

    switch (stakeholderRole) {
      case 'it_contact':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Configure OAuth Application',
            description: 'Set up OAuth 2.0 application in your CRM for secure authentication.',
            required_info: ['Client ID', 'Client Secret', 'Redirect URLs'],
            validation_criteria: ['OAuth app created', 'Credentials generated']
          },
          {
            step_number: 2,
            title: 'Map Data Fields',
            description: 'Configure field mappings between CRM and our platform.',
            required_info: ['Field mapping document', 'Custom field definitions', 'Data types'],
            validation_criteria: ['Fields mapped correctly', 'Data types compatible']
          },
          {
            step_number: 3,
            title: 'Test Data Synchronization',
            description: 'Verify bidirectional data sync is working correctly.',
            required_info: ['Test records', 'Sync logs', 'Error reports'],
            validation_criteria: ['Data sync successful', 'No sync errors']
          }
        ];
        baseInstructions.estimated_time_hours = 4;
        break;

      case 'technical_lead':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Review CRM Architecture',
            description: 'Understand CRM data model and integration requirements.',
            required_info: ['CRM schema', 'Integration patterns', 'Performance requirements'],
            validation_criteria: ['Architecture understood', 'Requirements documented']
          },
          {
            step_number: 2,
            title: 'Validate Integration Design',
            description: 'Ensure integration design meets technical and business requirements.',
            required_info: ['Integration design', 'Performance benchmarks', 'Security review'],
            validation_criteria: ['Design approved', 'Performance acceptable']
          }
        ];
        baseInstructions.estimated_time_hours = 2;
        break;

      case 'project_manager':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Plan CRM Integration',
            description: 'Coordinate CRM integration timeline and resources.',
            required_info: ['Project timeline', 'Resource allocation', 'Milestone definitions'],
            validation_criteria: ['Plan approved', 'Resources assigned']
          },
          {
            step_number: 2,
            title: 'Monitor Integration Progress',
            description: 'Track progress and manage any integration issues.',
            required_info: ['Progress reports', 'Issue tracking', 'Status updates'],
            validation_criteria: ['Progress on track', 'Issues resolved']
          }
        ];
        baseInstructions.estimated_time_hours = 1.5;
        break;

      default: // owner
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Provide CRM Details',
            description: 'Share information about your CRM system and requirements.',
            required_info: ['CRM platform', 'Admin contact', 'Integration goals'],
            validation_criteria: ['CRM details provided', 'Goals defined']
          }
        ];
        baseInstructions.estimated_time_hours = 0.5;
    }

    return baseInstructions;
  }

  /**
   * Generate SFTP integration instructions
   */
  static generateSFTPInstructions(stakeholderRole: Stakeholder['role']): IntegrationInstructions {
    const baseInstructions: IntegrationInstructions = {
      integration_type: 'SFTP',
      stakeholder_role: stakeholderRole,
      title: 'Secure File Transfer Protocol (SFTP) Integration Setup',
      description: 'Configure secure file transfer capabilities for automated data exchange.',
      steps: [],
      requirements: {
        technical: [
          'SFTP server with external access',
          'SSH key pair generation capability',
          'File system permissions management'
        ],
        access: [
          'SFTP server administrator access',
          'User account creation privileges',
          'Directory permission management'
        ],
        information: [
          'SFTP server hostname/IP',
          'Port configuration',
          'Authentication method preference'
        ]
      },
      estimated_time_hours: 2
    };

    switch (stakeholderRole) {
      case 'it_contact':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Configure SFTP Server',
            description: 'Set up SFTP server access and user accounts.',
            required_info: ['Server hostname', 'Port number', 'User credentials'],
            validation_criteria: ['Server accessible', 'User account created']
          },
          {
            step_number: 2,
            title: 'Set Up Directory Structure',
            description: 'Create required directories with appropriate permissions.',
            required_info: ['Directory paths', 'Permission settings', 'File naming conventions'],
            validation_criteria: ['Directories created', 'Permissions set correctly']
          },
          {
            step_number: 3,
            title: 'Test File Transfer',
            description: 'Verify file upload and download functionality.',
            required_info: ['Test files', 'Transfer logs', 'Error handling'],
            validation_criteria: ['File transfer successful', 'No permission errors']
          }
        ];
        baseInstructions.estimated_time_hours = 3;
        break;

      case 'technical_lead':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Review SFTP Security',
            description: 'Ensure SFTP configuration meets security requirements.',
            required_info: ['Security policies', 'Encryption settings', 'Access controls'],
            validation_criteria: ['Security approved', 'Compliance verified']
          }
        ];
        baseInstructions.estimated_time_hours = 1;
        break;

      case 'project_manager':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Coordinate SFTP Setup',
            description: 'Manage SFTP integration timeline and stakeholder coordination.',
            required_info: ['Project timeline', 'Stakeholder assignments', 'Progress tracking'],
            validation_criteria: ['Timeline established', 'Stakeholders coordinated']
          }
        ];
        baseInstructions.estimated_time_hours = 1;
        break;

      default:
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Provide SFTP Requirements',
            description: 'Share SFTP server details and access requirements.',
            required_info: ['Server information', 'Access requirements', 'File formats'],
            validation_criteria: ['Requirements documented', 'Access approved']
          }
        ];
        baseInstructions.estimated_time_hours = 0.5;
    }

    return baseInstructions;
  }

  /**
   * Generate API integration instructions
   */
  static generateAPIInstructions(stakeholderRole: Stakeholder['role']): IntegrationInstructions {
    const baseInstructions: IntegrationInstructions = {
      integration_type: 'API',
      stakeholder_role: stakeholderRole,
      title: 'Custom API Integration Setup',
      description: 'Configure custom API integration for specialized data exchange requirements.',
      steps: [],
      requirements: {
        technical: [
          'RESTful API with JSON support',
          'Authentication mechanism (API key, OAuth, etc.)',
          'Rate limiting and error handling'
        ],
        access: [
          'API development/configuration access',
          'Authentication credential management',
          'API documentation access'
        ],
        information: [
          'API endpoint URLs',
          'Authentication details',
          'Data schema documentation'
        ]
      },
      estimated_time_hours: 5
    };

    switch (stakeholderRole) {
      case 'it_contact':
      case 'technical_lead':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'API Endpoint Configuration',
            description: 'Configure API endpoints and authentication.',
            required_info: ['Endpoint URLs', 'Authentication tokens', 'Request/response formats'],
            validation_criteria: ['Endpoints accessible', 'Authentication working']
          },
          {
            step_number: 2,
            title: 'Data Schema Mapping',
            description: 'Map data schemas between systems.',
            required_info: ['Schema documentation', 'Field mappings', 'Data transformations'],
            validation_criteria: ['Schema mapped', 'Data transformation tested']
          },
          {
            step_number: 3,
            title: 'Integration Testing',
            description: 'Comprehensive testing of API integration.',
            required_info: ['Test cases', 'Error scenarios', 'Performance benchmarks'],
            validation_criteria: ['All tests passed', 'Performance acceptable']
          }
        ];
        baseInstructions.estimated_time_hours = 6;
        break;

      case 'project_manager':
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Plan API Integration',
            description: 'Coordinate API integration project timeline and resources.',
            required_info: ['Project scope', 'Resource allocation', 'Timeline milestones'],
            validation_criteria: ['Project plan approved', 'Resources assigned']
          },
          {
            step_number: 2,
            title: 'Monitor Integration Progress',
            description: 'Track API integration development and testing progress.',
            required_info: ['Progress reports', 'Issue tracking', 'Quality metrics'],
            validation_criteria: ['Progress on track', 'Issues resolved']
          }
        ];
        baseInstructions.estimated_time_hours = 2;
        break;

      default:
        baseInstructions.steps = [
          {
            step_number: 1,
            title: 'Define API Requirements',
            description: 'Specify API integration requirements and expectations.',
            required_info: ['Integration requirements', 'Data needs', 'Performance expectations'],
            validation_criteria: ['Requirements documented', 'Expectations set']
          }
        ];
        baseInstructions.estimated_time_hours = 1;
    }

    return baseInstructions;
  }

  /**
   * Generate integration instructions based on type and stakeholder role
   */
  static generateInstructions(
    integrationType: Integration['type'], 
    stakeholderRole: Stakeholder['role']
  ): IntegrationInstructions {
    switch (integrationType) {
      case 'SIS':
        return this.generateSISInstructions(stakeholderRole);
      case 'CRM':
        return this.generateCRMInstructions(stakeholderRole);
      case 'SFTP':
        return this.generateSFTPInstructions(stakeholderRole);
      case 'API':
        return this.generateAPIInstructions(stakeholderRole);
      default:
        // Generic instructions for 'other' type
        return {
          integration_type: integrationType,
          stakeholder_role: stakeholderRole,
          title: `${integrationType} Integration Setup`,
          description: `Configure ${integrationType} integration according to your specific requirements.`,
          steps: [
            {
              step_number: 1,
              title: 'Define Integration Requirements',
              description: 'Work with technical team to define specific integration requirements.',
              required_info: ['Integration specifications', 'Technical requirements', 'Timeline'],
              validation_criteria: ['Requirements documented', 'Technical approach approved']
            }
          ],
          requirements: {
            technical: ['System compatibility', 'API or data exchange capability'],
            access: ['System administrator access', 'Configuration permissions'],
            information: ['System documentation', 'Integration specifications']
          },
          estimated_time_hours: 2
        };
    }
  }

  /**
   * Generate comprehensive integration setup guide for an onboarding
   */
  static generateOnboardingIntegrationGuide(
    integrations: Integration[], 
    stakeholders: Stakeholder[]
  ): {
    overview: string;
    total_estimated_hours: number;
    integration_guides: {
      integration: Integration;
      stakeholder_instructions: {
        stakeholder: Stakeholder;
        instructions: IntegrationInstructions;
      }[];
    }[];
    coordination_notes: string[];
  } {
    const integrationGuides = integrations.map(integration => {
      const stakeholderInstructions = stakeholders.map(stakeholder => ({
        stakeholder,
        instructions: this.generateInstructions(integration.type, stakeholder.role)
      }));

      return {
        integration,
        stakeholder_instructions: stakeholderInstructions
      };
    });

    const totalEstimatedHours = integrationGuides.reduce((total, guide) => {
      const maxHoursForIntegration = Math.max(
        ...guide.stakeholder_instructions.map(si => si.instructions.estimated_time_hours)
      );
      return total + maxHoursForIntegration;
    }, 0);

    const coordinationNotes = [
      'Coordinate with all stakeholders before beginning integration setup',
      'Ensure IT contacts have necessary system access before starting',
      'Test integrations in a non-production environment first',
      'Document all configuration changes for future reference',
      'Plan for integration testing and validation time',
      'Have rollback procedures ready in case of issues'
    ];

    return {
      overview: `Integration setup guide for ${integrations.length} integration(s) involving ${stakeholders.length} stakeholder(s)`,
      total_estimated_hours: totalEstimatedHours,
      integration_guides: integrationGuides,
      coordination_notes: coordinationNotes
    };
  }
}
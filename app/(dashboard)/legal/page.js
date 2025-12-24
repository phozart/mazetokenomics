'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shield, FileText, Lock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const legalSections = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: Lock,
    content: `
**Last Updated: December 2025**

This Privacy Policy describes how Maze Tokenomics ("we", "us", or "the Application") collects, uses, and protects your personal information when you use our token analysis platform.

### 1. Information We Collect

**1.1 Account Information**
- Email address (for authentication)
- Username/display name
- Password (stored securely hashed)

**1.2 Wallet Information (Session Only - Not Stored)**
- When you connect your wallet, your public key is used temporarily to display your portfolio and execute transactions
- **We do NOT store your wallet address in our database**
- Token holdings are read directly from the Solana blockchain during your session
- When you disconnect your wallet or close the application, all wallet-related data is cleared from memory
- No wallet data persists after your session ends

**1.3 Usage Data**
- Tokens analyzed and added to watchlist
- Trading orders and DCA schedules created
- App feature usage patterns
- Log data (IP address, browser type, access times)

**1.4 Token Data**
- Token contract addresses submitted for analysis
- Analysis results and scores
- Price history data collected

### 2. How We Use Your Information

We use collected information to:
- Provide and maintain the Application services
- Process your token analysis requests
- Execute trading features (swaps, orders, DCA)
- Display your portfolio and watchlist
- Improve our services and user experience
- Send important service notifications

### 3. Data Storage and Security

- All account data is stored on secure servers
- Passwords are hashed using industry-standard algorithms
- **We never store your wallet private keys or wallet addresses**
- Wallet connections are session-based only - no wallet data is persisted
- Data is encrypted in transit using HTTPS
- Access to personal data is restricted to authorized personnel

### 4. Data Sharing

We do not sell your personal data. We may share data with:
- **Service Providers**: Third-party APIs (Jupiter, DexScreener, RugCheck) receive only token addresses for analysis
- **Legal Requirements**: When required by law or to protect rights

### 5. Your Rights (GDPR)

Under GDPR, you have the right to:
- **Access**: Request a copy of your personal data
- **Rectification**: Request correction of inaccurate data
- **Erasure**: Request deletion of your personal data
- **Portability**: Receive your data in a portable format
- **Objection**: Object to processing of your data
- **Restriction**: Request limitation of processing

To exercise these rights, contact the administrator at **maze@phozart.com**.

### 6. Data Retention

- Account data is retained while your account is active
- Trading history is retained for 2 years
- Token analysis data is retained indefinitely for reference
- You may request deletion at any time

### 7. Cookies and Local Storage

We use:
- Session cookies for authentication
- Local storage for user preferences
- No third-party advertising cookies

### 8. Children's Privacy

This Application is not intended for users under 18 years of age. We do not knowingly collect data from minors.

### 9. Changes to This Policy

We may update this Privacy Policy. Changes will be posted with an updated revision date.
    `,
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: FileText,
    content: `
**Last Updated: December 2025**

Please read these Terms of Service carefully before using Maze Tokenomics.

### 1. Acceptance of Terms

By accessing or using this Application, you agree to be bound by these Terms of Service. If you disagree with any part, you may not access the service.

### 2. Description of Service

Maze Tokenomics is a token analysis and trading platform that provides:
- Token security analysis and scoring
- Watchlist management
- Trading features (swaps, limit orders, DCA)
- Portfolio tracking

### 3. User Responsibilities

You agree to:
- Provide accurate account information
- Maintain the security of your account
- Not use the service for illegal activities
- Comply with all applicable laws and regulations
- Take full responsibility for your trading decisions

### 4. Financial Disclaimer

**IMPORTANT:**
- This Application provides information and tools, not financial advice
- Token scores and analyses are for informational purposes only
- Past performance does not guarantee future results
- Cryptocurrency trading involves substantial risk of loss
- You are solely responsible for your investment decisions
- We do not guarantee the accuracy of third-party data

### 5. No Warranty

The service is provided "AS IS" without warranties of any kind. We do not guarantee:
- Continuous, uninterrupted access
- Accuracy of token analyses
- Execution of trades
- Security of blockchain transactions

### 6. Limitation of Liability

To the maximum extent permitted by law:
- We are not liable for any trading losses
- We are not liable for failed transactions
- We are not liable for third-party service failures
- Our total liability shall not exceed the amount paid for the service

### 7. Third-Party Services

The Application integrates with:
- Jupiter Aggregator (for swaps and orders)
- DexScreener (for price data)
- RugCheck (for security analysis)
- Solana blockchain

We are not responsible for third-party service availability or accuracy.

### 8. Intellectual Property

All content, features, and functionality are owned by us and protected by copyright and other intellectual property laws.

### 9. Account Termination

We reserve the right to terminate or suspend access to the service at our sole discretion, without notice, for conduct that violates these Terms.

### 10. Governing Law

These Terms shall be governed by applicable laws. Disputes shall be resolved through arbitration.

### 11. Changes to Terms

We reserve the right to modify these Terms at any time. Continued use after changes constitutes acceptance.
    `,
  },
  {
    id: 'risk',
    title: 'Risk Disclosure',
    icon: AlertTriangle,
    content: `
**IMPORTANT RISK DISCLOSURE**

Please read this disclosure carefully before using any trading features.

### 1. Cryptocurrency Risk

Cryptocurrency investments are subject to high market risk. Prices can fluctuate significantly in a short time. You may:
- Lose some or all of your investment
- Experience significant price volatility
- Be unable to sell tokens due to low liquidity

### 2. Token Analysis Limitations

Our token analysis:
- Is based on available on-chain data
- Cannot detect all risks or scams
- May not reflect real-time changes
- Should not be the sole basis for investment decisions

A high score does not guarantee safety. A low score does not mean certain failure.

### 3. Smart Contract Risks

Interacting with smart contracts involves risks including:
- Contract vulnerabilities or bugs
- Failed transactions and lost gas fees
- Unexpected behavior or exploits
- Irreversible transactions

### 4. Trading Risks

When using trading features:
- Slippage may result in different execution prices
- Orders may not execute as expected
- Network congestion may delay transactions
- Gas fees fluctuate based on network conditions

### 5. DCA and Order Risks

Automated features like DCA and limit orders:
- Depend on third-party services
- May fail due to technical issues
- Do not guarantee execution
- May execute at unfavorable prices

### 6. Wallet Security

You are responsible for:
- Securing your wallet and private keys
- Verifying transaction details before signing
- Using reputable wallet software
- Being aware of phishing attempts

### 7. No Guarantee of Returns

We do not guarantee:
- Any level of returns on investments
- Successful trade execution
- Accuracy of price predictions
- Future token performance

### 8. Personal Responsibility

By using this Application, you acknowledge:
- You understand the risks involved
- You are making independent decisions
- You can afford to lose your investment
- You will not hold us liable for losses

### 9. Seek Professional Advice

We recommend consulting with qualified financial, legal, and tax professionals before making investment decisions.

**USE THIS APPLICATION AT YOUR OWN RISK**
    `,
  },
  {
    id: 'gdpr',
    title: 'GDPR Compliance',
    icon: Shield,
    content: `
**General Data Protection Regulation (GDPR) Compliance**

This section outlines our compliance with the EU General Data Protection Regulation.

### 1. Data Controller

The Application operates as the data controller for personal data processed through this platform.

### 2. Legal Basis for Processing

We process personal data based on:
- **Consent**: For optional features and communications
- **Contract**: To provide the services you request
- **Legitimate Interest**: For security and service improvement

### 3. Data Subject Rights

Under GDPR, you have the following rights:

**Right of Access (Article 15)**
You can request a copy of all personal data we hold about you.

**Right to Rectification (Article 16)**
You can request correction of inaccurate or incomplete data.

**Right to Erasure (Article 17)**
You can request deletion of your personal data ("right to be forgotten").

**Right to Restriction (Article 18)**
You can request limitation of processing in certain circumstances.

**Right to Data Portability (Article 20)**
You can receive your data in a machine-readable format.

**Right to Object (Article 21)**
You can object to processing based on legitimate interests.

### 4. Exercising Your Rights

To exercise any of these rights:
- Contact the administrator at **maze@phozart.com**
- Provide verification of your identity
- Specify which right you wish to exercise

We will respond within 30 days.

### 5. Data Protection Measures

We implement:
- Encryption of data in transit and at rest
- Access controls and authentication
- Regular security assessments
- Data minimization practices

### 6. International Transfers

If data is transferred outside the EU/EEA, we ensure appropriate safeguards are in place.

### 7. Data Breach Notification

In the event of a data breach that poses high risk to your rights, we will:
- Notify relevant supervisory authorities within 72 hours
- Inform affected individuals without undue delay

### 8. Data Protection Officer

For GDPR-related inquiries, contact: **maze@phozart.com**

### 9. Supervisory Authority

You have the right to lodge a complaint with your local data protection supervisory authority.
    `,
  },
];

function LegalSection({ section, isExpanded, onToggle }) {
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <CardHeader className="hover:bg-dark-hover/50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-400/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-6 border-t border-dark-border/50">
          <div
            className="prose prose-sm prose-invert max-w-none mt-4"
            style={{
              '--tw-prose-headings': 'rgb(229 231 235)',
              '--tw-prose-body': 'rgb(156 163 175)',
              '--tw-prose-bold': 'rgb(209 213 219)',
            }}
          >
            <div className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
              {section.content.split('\n').map((line, i) => {
                if (line.startsWith('###')) {
                  return <h3 key={i} className="text-gray-200 font-semibold text-base mt-6 mb-2">{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="text-gray-200 font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4 text-gray-400">{line.replace('- ', '')}</li>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="text-gray-400 my-1">{line.replace(/\*\*/g, '')}</p>;
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function LegalPage() {
  const [expandedSections, setExpandedSections] = useState(['privacy']);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const expandAll = () => {
    setExpandedSections(legalSections.map((s) => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  return (
    <div>
      <Header
        title="Legal & Privacy"
        description="Privacy policy, terms of service, and legal information"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </Header>

      <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Quick Summary - Key Points */}
        <Card className="bg-brand-400/5 border-brand-400/20">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-400" />
              Quick Summary - What You Need to Know
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your Wallet */}
              <div className="p-4 bg-dark-bg/50 rounded-lg">
                <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Your Wallet is Safe
                </h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• We <strong className="text-gray-200">never store</strong> your wallet address</li>
                  <li>• Private keys stay in your wallet only</li>
                  <li>• Portfolio data is read directly from blockchain</li>
                  <li>• All wallet data clears when you disconnect</li>
                </ul>
              </div>

              {/* Your Data */}
              <div className="p-4 bg-dark-bg/50 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Your Account Data
                </h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Email and password stored securely</li>
                  <li>• Watchlist and orders tied to your account</li>
                  <li>• You can request data deletion anytime</li>
                  <li>• We never sell your personal data</li>
                </ul>
              </div>

              {/* Trading */}
              <div className="p-4 bg-dark-bg/50 rounded-lg">
                <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Trading Risks
                </h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Crypto trading involves high risk</li>
                  <li>• We do not provide financial advice</li>
                  <li>• Token scores are informational only</li>
                  <li>• Only invest what you can afford to lose</li>
                </ul>
              </div>

              {/* Contact */}
              <div className="p-4 bg-dark-bg/50 rounded-lg">
                <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Contact & Support
                </h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Administrator: <span className="text-brand-400">maze@phozart.com</span></li>
                  <li>• GDPR requests within 30 days</li>
                  <li>• Data deletion available on request</li>
                  <li>• See full policies below</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-500 mb-1">Important Notice</h4>
              <p className="text-xs text-yellow-500/80">
                By using this application, you acknowledge that you have read and agree to the Terms of Service,
                Privacy Policy, and understand the risks associated with cryptocurrency trading.
                This application is for personal use and does not provide financial advice.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Full Legal Sections */}
        <div className="pt-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Full Legal Documentation</h3>
        </div>
        <div className="space-y-3">
          {legalSections.map((section) => (
            <LegalSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Contact */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-gray-100 mb-2">Questions or Concerns?</h3>
            <p className="text-sm text-gray-400 mb-3">
              For any legal or privacy-related inquiries, please contact the administrator:
            </p>
            <a
              href="mailto:maze@phozart.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 rounded-lg text-sm font-medium transition-colors"
            >
              maze@phozart.com
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

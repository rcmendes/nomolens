const whois = require('whois-json');

const WHOIS_TIMEOUT_MS = 5000;

const RESTRICTIONS = {
  // Generic restrictions
  edu: {
    description: 'Restricted to degree-granting educational institutions.',
    countryRestriction: 'Typically US-based accredited institutions, but exceptions exist.',
  },
  gov: {
    description: 'Restricted to government entities.',
    countryRestriction: 'United States government entities (federal, state, local, tribal).',
  },
  mil: {
    description: 'Restricted to military entities.',
    countryRestriction: 'United States military.',
  },
  int: {
    description: 'Restricted to international organizations established by treaty.',
    countryRestriction: 'None',
  },
  aero: {
    description: 'Restricted to members of the aviation community.',
    countryRestriction: 'None',
  },
  coop: {
    description: 'Restricted to cooperative associations.',
    countryRestriction: 'None',
  },
  museum: {
    description: 'Restricted to museums.',
    countryRestriction: 'None',
  },
  name: {
    description: 'Restricted to individuals for their personal names.',
    countryRestriction: 'None',
  },
  pro: {
    description: 'Restricted to credentialed professionals and related entities.',
    countryRestriction: 'None',
  },
  // Country Code restrictions
  us: {
    description: 'Requires a nexus with the United States.',
    countryRestriction:
      'Must be a US citizen, resident, organization, or a foreign entity with a bona fide presence in the US.',
  },
  eu: {
    description: 'Requires connection to the European Union.',
    countryRestriction:
      'Must reside in or be established within the European Union, Iceland, Liechtenstein, or Norway.',
  },
  ca: {
    description: 'Requires Canadian presence (Canadian Presence Requirements).',
    countryRestriction:
      'Must be a Canadian citizen, permanent resident, corporation, or have a registered trademark in Canada.',
  },
  uk: {
    description: 'Generally open, but some reserved rights exist.',
    countryRestriction:
      '.co.uk and .org.uk are unrestricted; however, registrants must provide a valid UK address if required.',
  },
  au: {
    description: 'Requires Australian presence.',
    countryRestriction:
      'Must be an Australian registered company, citizen, resident, or hold a registered trade mark in Australia.',
  },
  fr: {
    description: 'Requires European presence.',
    countryRestriction:
      'Must reside in or have a registered office in the EU, Iceland, Liechtenstein, Norway, or Switzerland.',
  },
  it: {
    description: 'Requires European presence.',
    countryRestriction:
      'Must reside in or have a registered office in the EEA (European Economic Area), Vatican City, San Marino, or Switzerland.',
  },
  es: {
    description: 'Requires ties to Spain.',
    countryRestriction: 'Registrant must have ties to Spain or operations in Spain.',
  },
  de: {
    description: 'Requires an administrative contact in Germany.',
    countryRestriction:
      'The registrant or the administrative contact must have a physical address in Germany.',
  },
  jp: {
    description: 'Requires Japanese presence.',
    countryRestriction: 'Must be an individual or organization with a physical address in Japan.',
  },
  cn: {
    description: 'Requires real-name verification.',
    countryRestriction:
      'Real-name verification ID required (Chinese ID or business license, or foreign equivalent).',
  },
  br: {
    description: 'Requires Brazilian document.',
    countryRestriction:
      'Must provide a valid Brazilian CPF (for individuals) or CNPJ (for companies).',
  },
};

/**
 * Wraps whois() with a timeout so a hanging WHOIS server
 * doesn't block the whole request indefinitely.
 */
function whoisWithTimeout(domainName) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`WHOIS lookup timed out after ${WHOIS_TIMEOUT_MS}ms`)),
      WHOIS_TIMEOUT_MS
    );
    whois(domainName)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

const UNKNOWN_RESULT = {
  owner: 'Unknown',
  purchasedDate: 'Unknown',
  expirationDate: 'Unknown',
  restrictions: {
    description: 'Could not fetch details.',
    countryRestriction: 'Unknown',
  },
};

async function getDomainInfo(domainName) {
  try {
    const results = await whoisWithTimeout(domainName);

    let owner = results.registrantOrganization || results.registrantName || 'Unknown / Privacy Protected';
    if (owner && owner.toLowerCase().includes('privacy')) {
      owner = 'Privacy Protected';
    }

    const purchasedDate = results.creationDate || 'Unknown';
    const expirationDate =
      results.registryExpiryDate || results.registrarRegistrationExpirationDate || 'Unknown';

    const tld = domainName.split('.').pop().toLowerCase();
    const restrictions = RESTRICTIONS[tld] || {
      description: 'Generally unrestricted.',
      countryRestriction: 'None',
    };

    return { owner, purchasedDate, expirationDate, restrictions, whoisError: false };
  } catch (error) {
    console.error('WHOIS lookup failed for', domainName, error.message);
    return { ...UNKNOWN_RESULT, whoisError: true };
  }
}

module.exports = { getDomainInfo };

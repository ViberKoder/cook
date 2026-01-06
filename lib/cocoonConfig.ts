// Cocoon Network Configuration
export const COCOON_ROOT_ADDRESS = 'EQCns7bYSp0igFvS1wpb5wsZjCKCV19MD5AVzI4EyxsnU73k';

// TON Center API endpoint
export const TON_CENTER_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';
export const TON_CENTER_API_KEY = process.env.NEXT_PUBLIC_TON_CENTER_API_KEY || '';

// Cocoon contract code hashes (base64)
export const COCOON_CODE_HASHES = {
  ROOT: 'WwfGvQw0c1h036NUjNmgHHi+Hg/fINDF6+N3djlsVAA=',
  PROXY: 'ALLFfUPB28PhLPokBJShaMeP7KkKm5nr55axOe1xOJA=',
  WORKER: 'GqoFEsSJoDgrFj99cG4rQYLxo4/MRiCL5foi1/rtWqc=',
  CLIENT: 'l00kU45gA7Gjk/hwhSW4EyTPiniu6ItFhdUbb2RVUUc=',
  WALLET: 'ekjwXO70DwbKu6o5wcWmeyTou1nYz4p05JmIpfRM9mo=',
};

// Operation codes
export const COCOON_OP = {
  CHARGE_SIGNED: 0xbb63ff93,
  PAYOUT_SIGNED: 0xa040ad28,
};


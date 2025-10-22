import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Upload, Tag, Loader, AlertCircle, CheckCircle, Image } from 'lucide-react';
import './index.css';

const CONTRACTS = {
  token: '0x2d07FAb56F8D405145EaD64573dD8ee1a4DDb2Fd',
  nft: '0x691E8D87F0eB6062Da23f0b0C1B117b885E7e1f2',
  marketplace: '0x5e94AB9302C8A10AE8D6060406Aa87e1207Bd51F'
};

const TOKEN_ABI = [{ "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }];

const NFT_ABI = [{ "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "string", "name": "uri", "type": "string" }], "name": "safeMint", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }];

const MARKETPLACE_ABI = [{ "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }], "name": "buyItem", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }], "name": "cancelListing", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "uint256", "name": "_price", "type": "uint256" }], "name": "listItem", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "listings", "outputs": [{ "internalType": "address", "name": "seller", "type": "address" }, { "internalType": "uint256", "name": "price", "type": "uint256" }], "stateMutability": "view", "type": "function" }];

export default function NFTMarketplace() {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [nftBalance, setNftBalance] = useState('0');
  const [myNFTs, setMyNFTs] = useState([]);
  const [listedNFTs, setListedNFTs] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('mynfts');
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [nftImage, setNftImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [listPriceForNFT, setListPriceForNFT] = useState({});

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 8000);
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      showMessage('error', 'Vui lòng cài đặt Metamask!');
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        });
      }
      setAccount(accounts[0]);
      setIsConnected(true);
      showMessage('success', 'Kết nối thành công!');
      await loadBalances(accounts[0]);
      await loadListedNFTs();
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = async () => {
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      }).then(() => window.ethereum.request({ method: 'eth_requestAccounts' }));
      setAccount(accounts[0]);
      showMessage('success', 'Đổi account thành công!');
      await loadBalances(accounts[0]);
      await loadListedNFTs();
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = useCallback(async (address) => {
    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const tokenContract = new window.ethers.Contract(CONTRACTS.token, TOKEN_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      setTokenBalance(window.ethers.utils.formatUnits(balance, decimals));
      const nftContract = new window.ethers.Contract(CONTRACTS.nft, NFT_ABI, provider);
      const nftCount = await nftContract.balanceOf(address);
      setNftBalance(nftCount.toString());
      await loadMyNFTs(address);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const loadMyNFTs = async (address) => {
    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const nftContract = new window.ethers.Contract(CONTRACTS.nft, NFT_ABI, provider);
      const list = [];
      for (let i = 0; i < 100; i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase()) {
            let uri = '';
            let metadata = null;
            try {
              uri = await nftContract.tokenURI(i);
              if (uri.startsWith('data:application/json')) {
                const base64Data = uri.split(',')[1];
                const jsonString = decodeURIComponent(escape(atob(base64Data)));
                metadata = JSON.parse(jsonString);
              } else if (uri.startsWith('ipfs://')) {
                const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                const response = await fetch(ipfsUrl);
                metadata = await response.json();
              }
            } catch (e) {
              uri = 'Token #' + i;
            }
            list.push({ tokenId: i, uri: uri, owner: owner, metadata: metadata });
          }
        } catch (e) { }
      }
      setMyNFTs(list);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadListedNFTs = async () => {
    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const marketplaceContract = new window.ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, provider);
      const nftContract = new window.ethers.Contract(CONTRACTS.nft, NFT_ABI, provider);
      const list = [];
      for (let i = 0; i < 100; i++) {
        try {
          const listing = await marketplaceContract.listings(i);
          if (listing.price.gt(0)) {
            let uri = '';
            let metadata = null;
            try {
              uri = await nftContract.tokenURI(i);
              if (uri.startsWith('data:application/json')) {
                const base64Data = uri.split(',')[1];
                const jsonString = decodeURIComponent(escape(atob(base64Data)));
                metadata = JSON.parse(jsonString);
              } else if (uri.startsWith('ipfs://')) {
                const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                const response = await fetch(ipfsUrl);
                metadata = await response.json();
              }
            } catch (e) {
              uri = 'Token #' + i;
            }
            list.push({
              tokenId: i,
              seller: listing.seller,
              price: window.ethers.utils.formatEther(listing.price),
              uri: uri,
              metadata: metadata
            });
          }
        } catch (e) { }
      }
      setListedNFTs(list);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNftImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Thêm API key và secret của bạn ở đây
  const PINATA_API_KEY = '22e4230e1280ee8d5f0d';
  const PINATA_API_SECRET = 'fa984102552b49294082bb71fcab5488a03c2eca2faf1ec4d12803a6dafe78c1';

  const uploadToPinata = async () => {
    if (!nftImage || !nftName) {
      showMessage('error', 'Vui lòng chọn ảnh và nhập tên NFT!');
      return null;
    }

    try {
      showMessage('info', 'Đang upload ảnh lên Pinata...');
      const formData = new FormData();
      formData.append('file', nftImage);

      // Upload ảnh lên Pinata
      const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET
        },
        body: formData
      });

      const imageData = await imageRes.json();
      const imageUrl = `ipfs://${imageData.IpfsHash}`;

      // Tạo metadata chuẩn ERC721
      const metadata = {
        name: nftName,
        description: nftDescription || 'NFT từ marketplace',
        image: imageUrl
      };

      // Upload metadata lên Pinata
      const metadataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET
        },
        body: JSON.stringify(metadata)
      });

      const metadataData = await metadataRes.json();
      const metadataUrl = `ipfs://${metadataData.IpfsHash}`;

      showMessage('success', 'Upload Pinata thành công!');
      return metadataUrl;
    } catch (error) {
      showMessage('error', 'Lỗi upload Pinata: ' + error.message);
      return null;
    }
  };

  const mintNFT = async () => {
    if (!nftImage || !nftName) {
      showMessage('error', 'Vui lòng chọn ảnh và nhập tên!');
      return;
    }

    try {
      setLoading(true);
      await ensureSepoliaNetwork(); // Đảm bảo mạng Sepolia
      const metadataURI = await uploadToPinata();
      if (!metadataURI) {
        setLoading(false);
        return;
      }

      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const nftContract = new window.ethers.Contract(CONTRACTS.nft, NFT_ABI, signer);

      showMessage('info', 'Đang mint NFT...');
      const tx = await nftContract.safeMint(account, metadataURI);
      await tx.wait();

      showMessage('success', 'Mint thành công! Xem tại My NFTs');
      setNftName('');
      setNftDescription('');
      setNftImage(null);
      setImagePreview('');
      setActiveTab('mynfts');
      await loadBalances(account);
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const listNFTFromCard = async (tokenId) => {
    const price = listPriceForNFT[tokenId];
    if (!price) {
      showMessage('error', 'Nhập giá!');
      return;
    }
    try {
      setLoading(true);
      await ensureSepoliaNetwork(); // Đảm bảo mạng Sepolia
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const nftContract = new window.ethers.Contract(CONTRACTS.nft, NFT_ABI, signer);
      const marketplaceContract = new window.ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
      showMessage('info', 'Approve NFT...');
      const approveTx = await nftContract.approve(CONTRACTS.marketplace, tokenId);
      await approveTx.wait();
      showMessage('info', 'List NFT...');
      const priceInWei = window.ethers.utils.parseEther(price);
      const listTx = await marketplaceContract.listItem(tokenId, priceInWei);
      await listTx.wait();
      showMessage('success', 'List thành công!');
      setListPriceForNFT({ ...listPriceForNFT, [tokenId]: '' });
      setActiveTab('marketplace');
      await loadBalances(account);
      await loadListedNFTs();
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const buyNFT = async (tokenId, price) => {
    try {
      setLoading(true);
      await ensureSepoliaNetwork(); // Đảm bảo mạng Sepolia
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tokenContract = new window.ethers.Contract(CONTRACTS.token, TOKEN_ABI, signer);
      const marketplaceContract = new window.ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
      showMessage('info', 'Approve token...');
      const priceInWei = window.ethers.utils.parseEther(price);
      const approveTx = await tokenContract.approve(CONTRACTS.marketplace, priceInWei);
      await approveTx.wait();
      showMessage('info', 'Mua NFT...');
      const buyTx = await marketplaceContract.buyItem(tokenId);
      await buyTx.wait();
      showMessage('success', 'Mua thành công!');
      await loadBalances(account);
      await loadListedNFTs();
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (tokenId) => {
    try {
      setLoading(true);
      await ensureSepoliaNetwork(); // Đảm bảo mạng Sepolia
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const marketplaceContract = new window.ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
      showMessage('info', 'Hủy listing...');
      const tx = await marketplaceContract.cancelListing(tokenId);
      await tx.wait();
      showMessage('success', 'Hủy thành công!');
      await loadBalances(account);
      await loadListedNFTs();
    } catch (error) {
      showMessage('error', 'Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const ensureSepoliaNetwork = async () => {
    const sepoliaChainId = '0xaa36a7';
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== sepoliaChainId) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sepoliaChainId }]
      });
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
      script.async = true;
      script.onload = async () => {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            await loadBalances(accounts[0]);
            await loadListedNFTs();
          }
        } catch (error) {
          console.error('Error:', error);
        }
      };
      document.body.appendChild(script);
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await loadBalances(accounts[0]);
          await loadListedNFTs();
        }
      });
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, [loadBalances]);

  const getImageUrl = (nft) => {
    if (nft.metadata && nft.metadata.image) {
      if (nft.metadata.image.startsWith('ipfs://')) {
        return nft.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      return nft.metadata.image;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {message.text && (
        <div className={'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 text-white max-w-md ' + (message.type === 'success' ? 'bg-green-500' : message.type === 'error' ? 'bg-red-500' : 'bg-blue-500')}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {message.type === 'info' && <Loader className="w-5 h-5 animate-spin" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}
      <header className="bg-black bg-opacity-40 backdrop-blur-md border-b border-purple-500">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AURA Marketplace</h1>
              <p className="text-xs text-purple-300">Sepolia Testnet</p>
            </div>
          </div>
          {!isConnected ? (
            <button onClick={connectWallet} disabled={loading} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50">
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              Kết nối
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-purple-300">AURA</div>
                <div className="text-white font-bold">{parseFloat(tokenBalance).toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-300">NFTs</div>
                <div className="text-white font-bold">{nftBalance}</div>
              </div>
              <span className="text-white font-mono text-sm">{account.slice(0, 6)}...{account.slice(-4)}</span>
              <button onClick={switchAccount} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">Đổi</button>
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <Wallet className="w-24 h-24 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Kết nối ví</h2>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex gap-4 border-b border-purple-500">
              <button onClick={() => setActiveTab('mint')} className={'px-6 py-3 font-semibold ' + (activeTab === 'mint' ? 'text-white border-b-2 border-purple-500' : 'text-purple-300')}>
                Mint NFT
              </button>
              <button onClick={() => setActiveTab('mynfts')} className={'px-6 py-3 font-semibold ' + (activeTab === 'mynfts' ? 'text-white border-b-2 border-purple-500' : 'text-purple-300')}>
                My NFTs ({myNFTs.length})
              </button>
              <button onClick={() => setActiveTab('marketplace')} className={'px-6 py-3 font-semibold ' + (activeTab === 'marketplace' ? 'text-white border-b-2 border-purple-500' : 'text-purple-300')}>
                Marketplace ({listedNFTs.length})
              </button>
            </div>

            {activeTab === 'mint' && (
              <div className="bg-white bg-opacity-10 rounded-2xl p-8 border border-purple-500 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-6">Mint NFT</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-purple-200 mb-3 text-sm font-semibold">Chọn ảnh</label>
                    <div className="border-2 border-dashed border-purple-400 rounded-lg p-8 text-center">
                      {imagePreview ? (
                        <div>
                          <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg mb-4" />
                          <button onClick={() => { setImagePreview(''); setNftImage(null); }} className="text-red-400">Xóa</button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Image className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                          <p className="text-purple-200">Click chọn ảnh</p>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-purple-200 mb-2">Tên NFT</label>
                    <input type="text" value={nftName} onChange={e => setNftName(e.target.value)} placeholder="Thanh Gươm Diệt Quỷ" className="w-full bg-white bg-opacity-20 border border-purple-400 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
                  </div>
                  <div>
                    <label className="block text-purple-200 mb-2">Mô tả</label>
                    <textarea value={nftDescription} onChange={e => setNftDescription(e.target.value)} placeholder="Mô tả..." rows="3" className="w-full bg-white bg-opacity-20 border border-purple-400 rounded-lg px-4 py-3 text-white placeholder-purple-300" />
                  </div>
                  <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4">
                    <p className="text-purple-200 text-sm">💡 Ảnh nên nhỏ hơn 200KB để tránh lỗi gas</p>
                  </div>
                  <button onClick={mintNFT} disabled={loading || !nftImage} className="w-full bg-green-600 text-white px-6 py-4 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    Mint NFT
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'mynfts' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">My NFTs</h2>
                {myNFTs.length === 0 ? (
                  <div className="text-center py-12 bg-white bg-opacity-10 rounded-2xl">
                    <p className="text-purple-200">Chưa có NFT</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {myNFTs.map(n => (
                      <div key={n.tokenId} className="bg-white bg-opacity-10 rounded-2xl overflow-hidden">
                        {getImageUrl(n) ? (
                          <img src={getImageUrl(n)} alt={n.metadata?.name} className="w-full h-64 object-cover" />
                        ) : (
                          <div className="w-full h-64 bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center">
                            <Tag className="w-20 h-20 text-white opacity-50" />
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-white font-bold mb-2">
                            {n.metadata && n.metadata.name
                              ? n.metadata.name
                              : `NFT #${n.tokenId}`}
                          </h3>
                          <p className="text-purple-300 text-xs mb-4">ID: #{n.tokenId}</p>
                          <input type="number" value={listPriceForNFT[n.tokenId] || ''} onChange={e => setListPriceForNFT({ ...listPriceForNFT, [n.tokenId]: e.target.value })} placeholder="Giá AURA" className="w-full bg-white bg-opacity-20 rounded px-3 py-2 text-white mb-2" />
                          <button onClick={() => listNFTFromCard(n.tokenId)} disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded">List</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'marketplace' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Marketplace</h2>
                {listedNFTs.length === 0 ? (
                  <div className="text-center py-12 bg-white bg-opacity-10 rounded-2xl">
                    <p className="text-purple-200">Chưa có NFT bán</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {listedNFTs.map(n => (
                      <div key={n.tokenId} className="bg-white bg-opacity-10 rounded-2xl overflow-hidden">
                        {getImageUrl(n) ? (
                          <img src={getImageUrl(n)} alt={n.metadata?.name} className="w-full h-64 object-cover" />
                        ) : (
                          <div className="w-full h-64 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <Tag className="w-20 h-20 text-white opacity-50" />
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-white font-bold mb-2">{n.metadata?.name || 'NFT #' + n.tokenId}</h3>
                          <p className="text-green-400 font-bold mb-4">{parseFloat(n.price).toFixed(2)} AURA</p>
                          {n.seller.toLowerCase() === account.toLowerCase() ? (
                            <button onClick={() => cancelListing(n.tokenId)} className="w-full bg-red-600 text-white px-4 py-2 rounded">Hủy</button>
                          ) : (
                            <button onClick={() => buyNFT(n.tokenId, n.price)} disabled={loading} className="w-full bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50">Mua</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
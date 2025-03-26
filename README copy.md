# hyperledger-fabric-helloworld

サプライチェーンのJS オンチェーン作成からcurl動作確認まで教えてください。
この時点ではAPIは考慮せず。テキストコスト節約

作業リポジトリ ディレクトリ
/home/ec2-user/dev/hyperledger-fabric-helloworld

fabricサンプルクローンしinstall-fabric.sh実行済み

36 hyperledger-fabric-helloworld]$ pwd
/home/ec2-user/dev/hyperledger-fabric-helloworld
[ec2-user@ip-172-31-33-136 hyperledger-fabric-helloworld]$ 
[ec2-user@ip-172-31-33-136 hyperledger-fabric-helloworld]$ ls -la
total 36
drwxr-xr-x.  4 ec2-user ec2-user   100 Mar 26 01:11 .
drwxr-xr-x.  3 ec2-user ec2-user    43 Mar 26 00:45 ..
drwxr-xr-x.  8 ec2-user ec2-user   181 Mar 26 01:11 .git
-rw-r--r--.  1 ec2-user ec2-user  2141 Mar 26 00:45 .gitignore
-rw-r--r--.  1 ec2-user ec2-user    31 Mar 26 00:45 README.md
drwxrwxr-x. 30 ec2-user ec2-user 16384 Mar 26 01:12 fabric-samples
-rwxr-xr-x.  1 ec2-user ec2-user 11133 Mar 26 00:45 install-fabric.sh
[ec2-user@ip-172-31-33-136 hyperledger-fabric-helloworld]$ 
[ec2-user@ip-172-31-33-136 hyperledger-fabric-helloworld]$ ls -la fabric-samples/
total 556
drwxrwxr-x. 30 ec2-user ec2-user  16384 Mar 26 01:12 .
drwxr-xr-x.  4 ec2-user ec2-user    100 Mar 26 01:11 ..
-rw-rw-r--.  1 ec2-user ec2-user    224 Mar 26 01:12 .editorconfig
drwxrwxr-x.  8 ec2-user ec2-user    163 Mar 26 01:12 .git
drwxrwxr-x.  4 ec2-user ec2-user     80 Mar 26 01:12 .github
-rw-rw-r--.  1 ec2-user ec2-user    528 Mar 26 01:12 .gitignore
-rw-rw-r--.  1 ec2-user ec2-user 398453 Mar 26 01:12 CHANGELOG.md
-rw-rw-r--.  1 ec2-user ec2-user    110 Mar 26 01:12 CODEOWNERS
-rw-rw-r--.  1 ec2-user ec2-user    618 Mar 26 01:12 CODE_OF_CONDUCT.md
-rw-rw-r--.  1 ec2-user ec2-user    935 Mar 26 01:12 CONTRIBUTING.md
-rw-rw-r--.  1 ec2-user ec2-user  11358 Mar 26 01:12 LICENSE
-rw-rw-r--.  1 ec2-user ec2-user   1132 Mar 26 01:12 MAINTAINERS.md
-rw-rw-r--.  1 ec2-user ec2-user   8544 Mar 26 01:12 README.md
-rw-rw-r--.  1 ec2-user ec2-user   1292 Mar 26 01:12 SECURITY.md
drwxrwxr-x.  3 ec2-user ec2-user     43 Mar 26 01:12 asset-transfer-abac
drwxrwxr-x. 13 ec2-user ec2-user  16384 Mar 26 01:12 asset-transfer-basic
drwxrwxr-x.  8 ec2-user ec2-user  16384 Mar 26 01:12 asset-transfer-events
drwxrwxr-x.  7 ec2-user ec2-user    136 Mar 26 01:12 asset-transfer-ledger-queries
drwxrwxr-x.  7 ec2-user ec2-user    161 Mar 26 01:12 asset-transfer-private-data
drwxrwxr-x.  5 ec2-user ec2-user    103 Mar 26 01:12 asset-transfer-sbe
drwxrwxr-x.  4 ec2-user ec2-user     81 Mar 26 01:12 asset-transfer-secured-agreement
drwxrwxr-x.  5 ec2-user ec2-user    101 Mar 26 01:12 auction-dutch
drwxrwxr-x.  4 ec2-user ec2-user     73 Mar 26 01:12 auction-simple
drwxr-xr-x.  2 ec2-user ec2-user    188 Aug 29  2023 bin
drwxr-xr-x.  3 ec2-user ec2-user     19 Apr  1  2023 builders
drwxrwxr-x.  3 ec2-user ec2-user     21 Mar 26 01:12 ci
drwxr-xr-x.  2 ec2-user ec2-user     64 Apr  1  2023 config
drwxrwxr-x.  8 ec2-user ec2-user  16384 Mar 26 01:12 full-stack-asset-transfer-guide
drwxrwxr-x.  6 ec2-user ec2-user    132 Mar 26 01:12 hardware-security-module
drwxrwxr-x.  4 ec2-user ec2-user    109 Mar 26 01:12 high-throughput
drwxrwxr-x.  5 ec2-user ec2-user     99 Mar 26 01:12 off_chain_data
drwxrwxr-x.  3 ec2-user ec2-user     24 Mar 26 01:12 test-application
drwxrwxr-x. 10 ec2-user ec2-user  16384 Mar 26 01:12 test-network
drwxrwxr-x.  6 ec2-user ec2-user    109 Mar 26 01:12 test-network-k8s
drwxrwxr-x.  6 ec2-user ec2-user  16384 Mar 26 01:12 test-network-nano-bash
drwxrwxr-x.  3 ec2-user ec2-user     43 Mar 26 01:12 token-erc-1155
drwxrwxr-x.  5 ec2-user ec2-user     93 Mar 26 01:12 token-erc-20
drwxrwxr-x.  5 ec2-user ec2-user     93 Mar 26 01:12 token-erc-721
drwxrwxr-x.  9 ec2-user ec2-user  16384 Mar 26 01:12 token-sdk
drwxrwxr-x.  3 ec2-user ec2-user     43 Mar 26 01:12 token-utxo
[ec2-user@ip-172-31-33-136 hyperledger-fabric-helloworld]$ 
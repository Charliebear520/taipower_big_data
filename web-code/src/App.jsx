import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Tabs, ConfigProvider, Button, message } from "antd";

const App = () => {
  const [dragging, setDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileProcessingStatus, setFileProcessingStatus] = useState({
    processed_files: [],
  });
  const [amiFileNames, setAmiFileNames] = useState([]);
  const [nbsFileNames, setNbsFileNames] = useState([]);
  const [activeTab, setActiveTab] = useState("1");

  const handleDrop = (event, type) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const names = files.map((file) => file.name);

    if (type === 'AMI') {
      setAmiFileNames([...amiFileNames, ...names]);
    } else if (type === 'NBS') {
      setNbsFileNames([...nbsFileNames, ...names]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleSubmit = async () => {
    const type = activeTab === "1" ? "AMI" : "NBS";
    const fileList = type === "AMI" ? amiFileNames : nbsFileNames;

    setLoading(true);
    setIsProcessing(true);
    try {
        const response = await axios.post(
            "http://127.0.0.1:5001/upload_gzfiles/",
            fileList
        );

        // 等待后台任务完成
        const checkStatus = async () => {
            let statusResponse;
            do {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 每2秒检查一次
                statusResponse = await axios.get("http://127.0.0.1:5001/get_file_processing_status/");
            } while (statusResponse.data.status === "processing");
            return statusResponse;
        };

        const finalStatus = await checkStatus();

        if (finalStatus.data.status === "idle") {
            if (type === "AMI") {
                setAmiFileNames([]);
            } else {
                setNbsFileNames([]);
            }
            console.log("Response:", finalStatus.data);
            message.success('資料已成功寫入資料庫'); // 显示成功提示框
        } else {
            message.error('上传失败，请重试！'); // 显示错误提示框
        }
    } catch (error) {
        console.error("Error uploading file names:", error);
        message.error('上传失败，请重试！'); // 显示错误提示框
    } finally {
        setLoading(false); // 在这里结束 spinner
    }
  };

  const handleRestart = (type) => {
    if (type === "AMI") {
      setAmiFileNames([]);
      setFileProcessingStatus((prev) => ({
        ...prev,
        processed_files: [],
      }));
      setIsProcessing(false);
    } else if (type === "NBS") {
      setNbsFileNames([]);
      setFileProcessingStatus((prev) => ({
        ...prev,
        processed_files: [],
      }));
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(
            "http://127.0.0.1:5001/get_file_processing_status/"
          );
          const status = response.data;

          setFileProcessingStatus(status);

          if (status.status === "idle") {
            clearInterval(interval);
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("Error fetching file processing status:", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div className="App">
      <ConfigProvider 
      theme={{
        components: {
          Tabs: {
            itemColor:"#82786b",
            itemSelectedColor:"#5d3b09",
            itemHoverColor:"#ffe8c6",
            fontSizeLG:16,
          },
        },
      }}
      >
        <Tabs defaultActiveKey="1" size="large" onChange={setActiveTab} tabBarGutter={32} type="card">
          <Tabs.TabPane tab="AMI" key="1">
            <h2 className="title">AMI 上傳區</h2>
            <div
              className={`drop-area ${dragging ? "dragging" : ""}`}
              onDrop={(event) => handleDrop(event, 'AMI')}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <p className="drop-desc">拖曳AMI檔案到這裡</p>
              <div
                className={
                  isProcessing || fileProcessingStatus.processed_files.length > 0
                    ? "message-list"
                    : "file-list"
                }
              >
                {isProcessing || fileProcessingStatus.processed_files.length > 0
                  ? fileProcessingStatus.processed_files.map(
                      (fileName, index) => <div key={index}>{fileName}</div>
                    )
                  : amiFileNames.map((fileName, index) => (
                      <div key={index} className="file-name-card">
                        {fileName}
                      </div>
                    ))}
              </div>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="NBS" key="2">
            <h2 className="title">NBS 上傳區</h2>
            <div
              className={`drop-area ${dragging ? "dragging" : ""}`}
              onDrop={(event) => handleDrop(event, 'NBS')}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <p className="drop-desc">拖曳NBS檔案到這裡</p>
              <div
                className={
                  isProcessing || fileProcessingStatus.processed_files.length > 0
                    ? "message-list"
                    : "file-list"
                }
              >
                {isProcessing || fileProcessingStatus.processed_files.length > 0
                  ? fileProcessingStatus.processed_files.map(
                      (fileName, index) => <div key={index}>{fileName}</div>
                    )
                  : nbsFileNames.map((fileName, index) => (
                      <div key={index} className="file-name-card">
                        {fileName}
                      </div>
                    ))}
              </div>
            </div>
          </Tabs.TabPane>
        </Tabs>

        <Button type="primary" onClick={handleSubmit} loading={loading}>
          上傳{activeTab === "1" ? "AMI" : "NBS"}檔案
        </Button>
        <Button onClick={() => handleRestart(activeTab === "1" ? "AMI" : "NBS")} danger>
          重新開始
        </Button>
      </ConfigProvider>
    </div>
  );
};

export default App;

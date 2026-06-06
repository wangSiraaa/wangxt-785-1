import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Form, Input, InputNumber, Select, Tag,
  Typography, message, Space, Modal, Descriptions, Alert, Statistic, Row, Col, Image
} from 'antd';
import { PlusOutlined, CheckOutlined, DeleteOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { claimApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const photoTypes = [
  { value: 'scene', label: '现场照片' },
  { value: 'damage', label: '损失部位照片' },
  { value: 'vehicle', label: '车辆全景照片' },
  { value: 'other', label: '其他照片' }
];

const damageParts = [
  '前保险杠', '后保险杠', '左前大灯', '右前大灯', '左后视镜', '右后视镜',
  '引擎盖', '后备箱盖', '左前车门', '右前车门', '左后车门', '右后车门',
  '前挡风玻璃', '后挡风玻璃', '左前翼子板', '右前翼子板', '车顶', '底盘',
  '水箱框架', '冷凝器', '散热器', '其他'
];

const damageTypes = [
  { value: 'repair', label: '维修' },
  { value: 'replace', label: '更换' },
  { value: 'paint', label: '喷漆' },
  { value: 'other', label: '其他' }
];

const partsSources = [
  { value: 'original', label: '原厂配件' },
  { value: '副厂', label: '副厂配件' },
  { value: '拆车', label: '拆车件' },
  { value: 'repair', label: '维修工时' }
];

function Assessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(id || null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [damageItems, setDamageItems] = useState([]);
  const [threshold, setThreshold] = useState(5000);
  const [itemForm] = Form.useForm();

  useEffect(() => {
    loadThreshold();
    if (selectedReportId) {
      loadReportDetail(selectedReportId);
    } else {
      loadPendingAssessReports();
    }
  }, [selectedReportId]);

  const loadThreshold = async () => {
    try {
      const data = await claimApi.getThresholds();
      const surveyor = data.find(t => t.role === 'surveyor');
      if (surveyor) setThreshold(surveyor.max_amount);
    } catch (e) {}
  };

  const loadPendingAssessReports = async () => {
    setLoading(true);
    try {
      const [pending, assessing, rejected] = await Promise.all([
        claimApi.getReports({ status: 'pending_assess' }),
        claimApi.getReports({ status: 'assessing' }),
        claimApi.getReports({ status: 'review_rejected' })
      ]);
      setReports([...pending, ...assessing, ...rejected]);
    } catch (error) {
      message.error('加载待定损案件失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetail = async (reportId) => {
    setLoading(true);
    try {
      const data = await claimApi.getReportById(reportId);
      setReport(data);
      setDamageItems(data.damage_items || []);
    } catch (error) {
      message.error('加载案件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (reportId) => {
    setSelectedReportId(reportId);
    navigate(`/assessment/${reportId}`);
  };

  const handleAddItem = async (values) => {
    const existingParts = damageItems.map(i => i.damage_part);
    if (existingParts.includes(values.damage_part)) {
      message.error('同一损失部位不能重复计价');
      return;
    }

    const totalAmount = (values.quantity * values.unit_price) + (values.labor_fee || 0);
    const newItem = {
      ...values,
      total_amount: totalAmount,
      id: Date.now().toString()
    };
    
    const newItems = [...damageItems, newItem];
    setDamageItems(newItems);
    setItemModalVisible(false);
    itemForm.resetFields();
    message.success('损失项目已添加');
    
    try {
      await claimApi.saveDamageItems(selectedReportId, newItems, '定损员李四');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const newItems = damageItems.filter(i => i.id !== itemId);
    setDamageItems(newItems);
    try {
      await claimApi.saveDamageItems(selectedReportId, newItems, '定损员李四');
      message.success('已删除');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSubmitAssessment = async () => {
    if (report?.photos.length === 0) {
      message.error({
        content: '请先上传现场照片后再提交定损',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 3
      });
      return;
    }

    if (damageItems.length === 0) {
      message.error('请先录入损失项目');
      return;
    }

    if (report?.status === 'review_rejected') {
      const allHasNotes = damageItems.every(item => item.adjustment_note && item.adjustment_note.trim());
      if (!allHasNotes) {
        message.error('复核退回后再次提交，所有损失项目必须填写调整说明');
        return;
      }
    }

    setSubmitLoading(true);
    try {
      await claimApi.saveDamageItems(selectedReportId, damageItems, '定损员李四');
      const result = await claimApi.submitAssessment(selectedReportId, '定损员李四');
      
      if (result.status === 'pending_review') {
        message.warning(`定损总金额 ${result.total_amount.toFixed(2)} 元超过权限 ${threshold} 元，已进入复核队列`);
        navigate('/review');
      } else if (result.status === 'pending_pay') {
        message.success('定损提交成功，已进入赔付建议环节');
        navigate(`/report/${selectedReportId}`);
      } else {
        message.success('定损提交成功');
        navigate('/');
      }
    } catch (error) {
      const errorMsg = error.message || '提交失败';
      if (errorMsg.includes('照片') || errorMsg.includes('photo')) {
        message.error({
          content: errorMsg,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          duration: 3
        });
      } else {
        message.error('提交失败: ' + errorMsg);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalAmount = damageItems.reduce((sum, item) => sum + item.total_amount, 0);
  const isOverThreshold = totalAmount > threshold;
  const isRejected = report?.status === 'review_rejected';

  const itemColumns = [
    { title: '损失部位', dataIndex: 'damage_part', key: 'damage_part', width: 120 },
    { title: '损失类型', dataIndex: 'damage_type', key: 'damage_type', width: 100,
      render: (v) => damageTypes.find(t => t.value === v)?.label || v },
    { title: '项目名称', dataIndex: 'item_name', key: 'item_name' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: '单价(元)', dataIndex: 'unit_price', key: 'unit_price', width: 100 },
    { title: '工时费(元)', dataIndex: 'labor_fee', key: 'labor_fee', width: 100 },
    { title: '小计(元)', dataIndex: 'total_amount', key: 'total_amount', width: 100,
      render: (v) => v.toFixed(2) },
    { title: '配件来源', dataIndex: 'parts_source', key: 'parts_source', width: 120,
      render: (v) => partsSources.find(s => s.value === v)?.label || v },
    { title: '调整说明', dataIndex: 'adjustment_note', key: 'adjustment_note',
      render: (v) => v || '-' },
    { title: '操作', key: 'action', width: 80,
      render: (_, record) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(record.id)}>删除</Button>
      )
    }
  ];

  if (!selectedReportId) {
    return (
      <div>
        <div className="page-header">
          <Title level={3}>定损管理</Title>
        </div>
        <Card>
          <Title level={5}>选择待定损案件</Title>
          <Table
            columns={[
              { title: '报案号', dataIndex: 'report_no', key: 'report_no' },
              { title: '报案人', dataIndex: 'reporter_name', key: 'reporter_name' },
              { title: '车牌号', dataIndex: 'vehicle_plate', key: 'vehicle_plate' },
              { title: '状态', dataIndex: 'status_name', key: 'status_name',
                render: (text, record) => (
                  <Tag color={record.status === 'review_rejected' ? 'error' : 'warning'}>
                    {text}
                  </Tag>
                )
              },
              { title: '报案时间', dataIndex: 'created_at', key: 'created_at',
                render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
              { title: '操作', key: 'action',
                render: (_, record) => (
                  <Button type="link" onClick={() => handleSelectReport(record.id)}>
                    开始定损
                  </Button>
                )
              }
            ]}
            dataSource={reports}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={3}>定损管理 - {report?.report_no}</Title>
      </div>

      {report && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="案件基本信息" size="small">
            <Descriptions column={4} size="small">
              <Descriptions.Item label="报案号">{report.report_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={isRejected ? 'error' : 'processing'}>{report.status_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="车牌号">{report.vehicle_plate}</Descriptions.Item>
              <Descriptions.Item label="车辆">{report.vehicle_brand} {report.vehicle_model}</Descriptions.Item>
            </Descriptions>
            {isRejected && report.reviews.length > 0 && (
              <Alert
                message={`复核退回意见：${report.reviews[report.reviews.length - 1].review_opinion}`}
                type="error"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginTop: 12 }}
              />
            )}
          </Card>

          <Card title="已上传查勘照片" size="small">
            {report.photos.length === 0 && (
              <Alert
                message="尚未上传查勘照片，请先返回查勘页面上传现场照片后再进行定损"
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" type="primary" onClick={() => navigate(`/survey/${report.id}`)}>
                    去上传照片
                  </Button>
                }
              />
            )}
            <Row gutter={[16, 16]}>
              {report.photos.map(photo => (
                <Col span={6} key={photo.id}>
                  <Card
                    size="small"
                    cover={
                      photo.file_path ? (
                        <Image
                          alt={photo.damage_part}
                          src={photo.file_path}
                          height={120}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ 
                          height: 120, 
                          backgroundColor: '#f0f0f0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#999'
                        }}>
                          {photo.damage_part}
                        </div>
                      )
                    }
                  >
                    <Card.Meta
                      title={photo.damage_part}
                      description={
                        <>
                          <div>{photoTypes.find(p => p.value === photo.photo_type)?.label}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {photo.upload_by} {dayjs(photo.upload_time).format('MM-DD HH:mm')}
                          </div>
                        </>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          <Card
            title="损失项目录入"
            size="small"
            extra={
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setItemModalVisible(true)}>
                  添加损失项目
                </Button>
              </Space>
            }
          >
            {isRejected && (
              <Alert
                message="复核退回后再次提交，所有损失项目必须填写调整说明"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Table
              columns={itemColumns}
              dataSource={damageItems}
              rowKey="id"
              pagination={false}
              size="small"
              footer={() => (
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="定损总金额" value={totalAmount} precision={2} suffix="元"
                      valueStyle={{ color: isOverThreshold ? '#cf1322' : '#3f8600', fontSize: 18 }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="定损员权限" value={threshold} suffix="元" />
                  </Col>
                  <Col span={8}>
                    {isOverThreshold ? (
                      <Tag color="red" icon={<WarningOutlined />}>
                        超过权限，需提交复核
                      </Tag>
                    ) : (
                      <Tag color="green">在权限范围内</Tag>
                    )}
                  </Col>
                </Row>
              )}
            />
          </Card>

          <Card>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={submitLoading}
                disabled={damageItems.length === 0 || report.photos.length === 0}
                onClick={handleSubmitAssessment}
              >
                {isOverThreshold ? '提交复核' : '提交定损'}
              </Button>
              <Button onClick={() => navigate('/')}>返回列表</Button>
            </Space>
          </Card>
        </Space>
      )}

      <Modal
        title="添加损失项目"
        open={itemModalVisible}
        onCancel={() => setItemModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form form={itemForm} layout="vertical" onFinish={handleAddItem}>
          <Form.Item
            name="damage_part"
            label="损失部位"
            rules={[{ required: true, message: '请选择损失部位' }]}
          >
            <Select placeholder="请选择" showSearch filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }>
              {damageParts.map(p => (
                <Option key={p} value={p}>{p}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="damage_type"
            label="损失类型"
            rules={[{ required: true, message: '请选择损失类型' }]}
          >
            <Select placeholder="请选择">
              {damageTypes.map(t => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="item_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：前保险杠修复" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[{ required: true, message: '请输入数量' }]}
                initialValue={1}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label="单价(元)"
                rules={[{ required: true, message: '请输入单价' }]}
                initialValue={0}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="labor_fee"
                label="工时费(元)"
                initialValue={0}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="parts_source"
            label="配件来源"
            rules={[{ required: true, message: '请选择配件来源' }]}
          >
            <Select placeholder="请选择">
              {partsSources.map(s => (
                <Option key={s.value} value={s.value}>{s.label}</Option>
              ))}
            </Select>
          </Form.Item>
          {isRejected && (
            <Form.Item
              name="adjustment_note"
              label="调整说明"
              rules={[{ required: true, message: '复核退回后必须填写调整说明' }]}
            >
              <TextArea rows={2} placeholder="请说明本次调整的原因" />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确定添加</Button>
              <Button onClick={() => setItemModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Assessment;

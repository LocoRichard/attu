import { ReactElement } from 'react';
import { IndexState } from '../../types/Milvus';
import { DataType } from '../collections/Types';

export enum INDEX_TYPES_ENUM {
  IVF_FLAT = 'IVF_FLAT',
  IVF_PQ = 'IVF_PQ',
  IVF_SQ8 = 'IVF_SQ8',
  IVF_SQ8_HYBRID = 'IVF_SQ8_HYBRID',
  FLAT = 'FLAT',
  HNSW = 'HNSW',
  ANNOY = 'ANNOY',
  RNSG = 'RNSG',
}

export interface FieldView extends IndexView {
  _fieldId: string;
  _isPrimaryKey: boolean;
  _fieldName: string;
  _fieldNameElement?: ReactElement;
  _fieldType: DataType;
  _dimension: string;
  _createIndexDisabled: boolean;
}

export interface Index {
  params: { key: string; value: string }[];
}

export interface IndexView {
  _fieldName: string;
  _indexType: string;
  _indexTypeElement?: ReactElement;
  _indexParameterPairs: { key: string; value: string }[];
  _indexParamElement?: ReactElement;
}

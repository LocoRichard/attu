import { TextField, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { useNavigationHook } from '../../hooks/Navigation';
import { ALL_ROUTER_TYPES } from '../../router/Types';
import CustomSelector from '../../components/customSelector/CustomSelector';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SearchParams from './SearchParams';
import { DEFAULT_METRIC_VALUE_MAP } from '../../consts/Milvus';
import { FieldOption, SearchResultView, VectorSearchParam } from './Types';
import MilvusGrid from '../../components/grid/Grid';
import EmptyCard from '../../components/cards/EmptyCard';
import icons from '../../components/icons/Icons';
import { usePaginationHook } from '../../hooks/Pagination';
import CustomButton from '../../components/customButton/CustomButton';
import SimpleMenu from '../../components/menu/SimpleMenu';
import { TOP_K_OPTIONS } from './Constants';
import { Option } from '../../components/customSelector/Types';
import { CollectionHttp } from '../../http/Collection';
import { CollectionData, DataTypeEnum } from '../collections/Types';
import { IndexHttp } from '../../http/Index';
import { getVectorSearchStyles } from './Styles';
import { parseValue } from '../../utils/Insert';
import {
  classifyFields,
  getDefaultIndexType,
  getEmbeddingType,
  getNonVectorFieldsForFilter,
  getVectorFieldOptions,
  transferSearchResult,
} from '../../utils/search';
import { ColDefinitionsType } from '../../components/grid/Types';
import Filter from '../../components/advancedSearch';
import { Field } from '../../components/advancedSearch/Types';
import { useParams } from 'react-router-dom';

const VectorSearch = () => {
  useNavigationHook(ALL_ROUTER_TYPES.SEARCH);
  const { collectionName = '' } = useParams<{
    collectionName: string;
  }>();

  // i18n
  const { t: searchTrans } = useTranslation('search');
  const { t: btnTrans } = useTranslation('btn');
  const classes = getVectorSearchStyles();

  // data stored inside the component
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  // fields for advanced filter
  const [filterFields, setFilterFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string>('');
  // search params form
  const [searchParam, setSearchParam] = useState<{ [key in string]: number }>(
    {}
  );
  // search params disable state
  const [paramDisabled, setParamDisabled] = useState<boolean>(true);
  // use null as init value before search, empty array means no results
  const [searchResult, setSearchResult] = useState<SearchResultView[] | null>(
    null
  );
  // default topK is 100
  const [topK, setTopK] = useState<number>(100);
  const [expression, setExpression] = useState<string>('');
  const [vectors, setVectors] = useState<string>('');

  const {
    pageSize,
    handlePageSize,
    currentPage,
    handleCurrentPage,
    total,
    data: result,
  } = usePaginationHook(searchResult || []);

  const searchDisabled = useMemo(() => {
    /**
     * before search, user must:
     * 1. enter vector value
     * 2. choose collection and field
     * 3. set extra search params
     */
    const isInvalid =
      vectors === '' ||
      selectedCollection === '' ||
      selectedField === '' ||
      paramDisabled;
    return isInvalid;
  }, [paramDisabled, selectedField, selectedCollection, vectors]);

  const collectionOptions: Option[] = useMemo(
    () =>
      collections.map(c => ({
        label: c._name,
        value: c._name,
      })),
    [collections]
  );

  const outputFields: string[] = useMemo(() => {
    const fields =
      collections.find(c => c._name === selectedCollection)?._fields || [];
    // vector field can't be output fields
    const invalidTypes = ['BinaryVector', 'FloatVector'];
    const nonVectorFields = fields.filter(
      field => !invalidTypes.includes(field._fieldType)
    );
    return nonVectorFields.map(f => f._fieldName);
  }, [selectedCollection, collections]);

  const colDefinitions: ColDefinitionsType[] = useMemo(() => {
    // filter id and score
    return searchResult && searchResult.length > 0
      ? Object.keys(searchResult[0])
          .filter(item => item !== 'id' && item !== 'score')
          .map(key => ({
            id: key,
            align: 'left',
            disablePadding: false,
            label: key,
          }))
      : [];
  }, [searchResult]);

  const { metricType, indexType, indexParams, fieldType, embeddingType } =
    useMemo(() => {
      if (selectedField !== '') {
        // field options must contain selected field, so selectedFieldInfo will never undefined
        const selectedFieldInfo = fieldOptions.find(
          f => f.value === selectedField
        );
        const index = selectedFieldInfo?.indexInfo;
        const embeddingType = getEmbeddingType(selectedFieldInfo!.fieldType);
        const metric =
          index?._metricType || DEFAULT_METRIC_VALUE_MAP[embeddingType];
        const indexParams = index?._indexParameterPairs || [];

        return {
          metricType: metric,
          indexType: index?._indexType || getDefaultIndexType(embeddingType),
          indexParams,
          fieldType: DataTypeEnum[selectedFieldInfo?.fieldType!],
          embeddingType,
        };
      }

      return {
        metricType: '',
        indexType: '',
        indexParams: [],
        fieldType: 0,
        embeddingType: DataTypeEnum.FloatVector,
      };
    }, [selectedField, fieldOptions]);

  // fetch data
  const fetchCollections = useCallback(async () => {
    const collections = await CollectionHttp.getCollections();
    setCollections(collections);
  }, []);

  const fetchFieldsWithIndex = useCallback(
    async (collectionName: string, collections: CollectionData[]) => {
      const fields =
        collections.find(c => c._name === collectionName)?._fields || [];
      const indexes = await IndexHttp.getIndexInfo(collectionName);

      const { vectorFields, nonVectorFields } = classifyFields(fields);

      // only vector type fields can be select
      const fieldOptions = getVectorFieldOptions(vectorFields, indexes);
      setFieldOptions(fieldOptions);
      // only non vector type fields can be advanced filter
      const filterFields = getNonVectorFieldsForFilter(nonVectorFields);
      setFilterFields(filterFields);
    },
    []
  );

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // get field options with index when selected collection changed
  useEffect(() => {
    if (selectedCollection !== '') {
      fetchFieldsWithIndex(selectedCollection, collections);
    }
  }, [selectedCollection, collections, fetchFieldsWithIndex]);

  // set collection value if is from overview page
  useEffect(() => {
    if (collectionName) {
      setSelectedCollection(collectionName);
    }
  }, [collectionName]);

  // icons
  const VectorSearchIcon = icons.vectorSearch;
  const ResetIcon = icons.refresh;
  const ArrowIcon = icons.dropdown;

  // methods
  const handlePageChange = (e: any, page: number) => {
    handleCurrentPage(page);
  };
  const handleReset = () => {
    /**
     * reset search includes:
     * 1. reset vectors
     * 2. reset selected collection and field
     * 3. reset search params
     * 4. reset advanced filter expression
     * 5. clear search result
     */
    setVectors('');
    setSelectedField('');
    setSelectedCollection('');
    setSearchResult(null);
    setFilterFields([]);
    setExpression('');
  };
  const handleSearch = async (topK: number, expr = expression) => {
    const searhParamPairs = [
      // dynamic search params
      {
        key: 'params',
        value: JSON.stringify(searchParam),
      },
      {
        key: 'anns_field',
        value: selectedField,
      },
      {
        key: 'topk',
        value: topK,
      },
      {
        key: 'metric_type',
        value: metricType,
      },
    ];

    const params: VectorSearchParam = {
      output_fields: outputFields,
      expr,
      search_params: searhParamPairs,
      vectors: [parseValue(vectors)],
      vector_type: fieldType,
    };

    setTableLoading(true);
    try {
      const res = await CollectionHttp.vectorSearchData(
        selectedCollection,
        params
      );
      setTableLoading(false);

      const result = transferSearchResult(res.results);
      setSearchResult(result);
    } catch (err) {
      setTableLoading(false);
    }
  };
  const handleAdvancedFilterChange = (expression: string) => {
    setExpression(expression);
    if (!searchDisabled) {
      handleSearch(topK, expression);
    }
  };

  const handleVectorChange = (value: string) => {
    setVectors(value);
  };

  return (
    <section className="page-wrapper">
      {/* form section */}
      <form className={classes.form}>
        {/* vector value textarea */}
        <fieldset className="field">
          <Typography className="text">{searchTrans('firstTip')}</Typography>
          <TextField
            className="textarea"
            InputProps={{
              classes: {
                root: 'textfield',
                multiline: 'multiline',
              },
            }}
            multiline
            rows={5}
            placeholder={searchTrans('vectorPlaceholder')}
            value={vectors}
            onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
              handleVectorChange(e.target.value as string);
            }}
          />
        </fieldset>
        {/* collection and field selectors */}
        <fieldset className="field field-second">
          <Typography className="text">{searchTrans('secondTip')}</Typography>
          <CustomSelector
            options={collectionOptions}
            wrapperClass={classes.selector}
            variant="filled"
            label={searchTrans(
              collectionOptions.length === 0 ? 'noCollection' : 'collection'
            )}
            disabled={collectionOptions.length === 0}
            value={selectedCollection}
            onChange={(e: { target: { value: unknown } }) => {
              const collection = e.target.value;
              setSelectedCollection(collection as string);
              // every time selected collection changed, reset field
              setSelectedField('');
            }}
          />
          <CustomSelector
            options={fieldOptions}
            // readOnly can't avoid all events, so we use disabled instead
            disabled={selectedCollection === ''}
            wrapperClass={classes.selector}
            variant="filled"
            label={searchTrans('field')}
            value={selectedField}
            onChange={(e: { target: { value: unknown } }) => {
              const field = e.target.value;
              setSelectedField(field as string);
            }}
          />
        </fieldset>
        {/* search params selectors */}
        <fieldset className="field field-params">
          <Typography className="text">{searchTrans('thirdTip')}</Typography>
          <SearchParams
            wrapperClass={classes.paramsWrapper}
            metricType={metricType!}
            embeddingType={
              embeddingType as
                | DataTypeEnum.BinaryVector
                | DataTypeEnum.FloatVector
            }
            indexType={indexType}
            indexParams={indexParams!}
            searchParamsForm={searchParam}
            handleFormChange={setSearchParam}
            topK={topK}
            setParamsDisabled={setParamDisabled}
          />
        </fieldset>
      </form>

      {/**
       * search toolbar section
       * including topK selector, advanced filter, search and reset btn
       */}
      <section className={classes.toolbar}>
        <div className="left">
          <Typography variant="h5" className="text">
            {`${searchTrans('result')}: `}
          </Typography>
          {/* topK selector */}
          <SimpleMenu
            label={searchTrans('topK', { number: topK })}
            menuItems={TOP_K_OPTIONS.map(item => ({
              label: item.toString(),
              callback: () => {
                setTopK(item);
                if (!searchDisabled) {
                  handleSearch(item);
                }
              },
              wrapperClass: classes.menuItem,
            }))}
            buttonProps={{
              className: classes.menuLabel,
              endIcon: <ArrowIcon />,
            }}
            menuItemWidth="108px"
          />

          <Filter
            title="Advanced Filter"
            fields={filterFields}
            filterDisabled={selectedField === '' || selectedCollection === ''}
            onSubmit={handleAdvancedFilterChange}
          />
        </div>
        <div className="right">
          <CustomButton className="btn" onClick={handleReset}>
            <ResetIcon classes={{ root: 'icon' }} />
            {btnTrans('reset')}
          </CustomButton>
          <CustomButton
            variant="contained"
            disabled={searchDisabled}
            onClick={() => handleSearch(topK)}
          >
            {btnTrans('search')}
          </CustomButton>
        </div>
      </section>

      {/* search result table section */}
      {(searchResult && searchResult.length > 0) || tableLoading ? (
        <MilvusGrid
          toolbarConfigs={[]}
          colDefinitions={colDefinitions}
          rows={result}
          rowCount={total}
          primaryKey="rank"
          page={currentPage}
          onChangePage={handlePageChange}
          rowsPerPage={pageSize}
          setRowsPerPage={handlePageSize}
          openCheckBox={false}
          isLoading={tableLoading}
        />
      ) : (
        <EmptyCard
          wrapperClass={`page-empty-card`}
          icon={<VectorSearchIcon />}
          text={
            searchResult !== null
              ? searchTrans('empty')
              : searchTrans('startTip')
          }
        />
      )}
    </section>
  );
};

export default VectorSearch;

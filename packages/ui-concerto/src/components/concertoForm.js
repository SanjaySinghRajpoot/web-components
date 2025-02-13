/* eslint-disable react/require-default-props */
/* eslint-disable no-underscore-dangle */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash.get';
import set from 'lodash.set';
import toPath from 'lodash.topath';
import { Form, Dimmer, Loader, Message } from 'semantic-ui-react';
import { ModelManager } from '@accordproject/concerto-core';

import ReactFormVisitor from '../reactformvisitor';
import FormGenerator from '../formgenerator';
import './concertoForm.css';

/**
 * This React component generates a React object for a bound model.
 */
const ConcertoForm = (props) => {
  const [value, setValue] = useState(props.json);
  const [loading, setLoading] = useState(true);
  const [modelManager, setModelManager] = useState(null);
  const { onValueChange, options, models } = props;

  useEffect(() => {
    setValue(props.json);
  }, [props.json]);

  const onFieldValueChange = useCallback((e, key) => {
    const fieldValue = e.type === 'checkbox' ? e.checked : e.value;
    const valueClone = set({ ...value }, key, fieldValue);
    setValue(valueClone);
    onValueChange(valueClone);
  }, [onValueChange, value]);

  const removeElement = useCallback((e, key, index) => {
    const array = get(value, key);
    array.splice(index, 1);
    const valueClone = set({ ...value }, key, array);
    setValue(valueClone);
    onValueChange(value);
  }, [onValueChange, value]);

  const addElement = useCallback((e, key, elementValue) => {
    const pathKey = toPath(key);
    const array = get(value, pathKey) || [];
    const valueClone = set(
      { ...value },
      [...pathKey, array.length],
      elementValue
    );
    setValue(valueClone);
    onValueChange(valueClone);
  }, [onValueChange, value]);

  // Default values which can be overridden by parent components
  const generatorOptions = React.useMemo(() => ({
    includeOptionalFields: true,
    includeSampleData: 'sample',
    disabled: props.readOnly,
    visitor: new ReactFormVisitor(),
    onFieldValueChange: (e, key) => {
      onFieldValueChange(e, key);
    },
    addElement: (e, key, field) => {
      addElement(e, key, field);
    },
    removeElement: (e, key, index) => {
      removeElement(e, key, index);
    },
    ...options,
  }), [addElement, onFieldValueChange, removeElement, options, props.readOnly]);

  const generator = React.useMemo(() => {
    if (modelManager) {
      try {
        return new FormGenerator(modelManager, generatorOptions);
      } catch (err) {
        console.log(err);
      }
    }
    return null;
  }, [modelManager, generatorOptions]);

  useEffect(() => {
    setLoading(true);
    const modelManager = new ModelManager();
    models.forEach((model, idx) => {
      try {
        modelManager.addModelFile(model, `model-${idx}`, true);
      } catch (err) {
        console.log(err);
      }
    });
    if (options.updateExternalModels) {
      modelManager.updateExternalModels().then(() => {
        setModelManager(modelManager);
        setLoading(false);
      });
    } else {
      setModelManager(modelManager);
      setLoading(false);
    }
  }, [models, options.updateExternalModels]);

  useEffect(() => {
    if (props.type && generator) {
      if (!value) {
        try {
          const newJSON = generator.generateJSON(props.type);
          setValue(newJSON);
        } catch (err) {
          console.log(err);
        }
      }
    }
  }, [generator, props.type, value]);

  if (loading) {
    return (
      <Dimmer active inverted>
        <Loader inverted>Loading</Loader>
      </Dimmer>
    );
  }

  if (props.type && value) {
    try {
      const form = generator.generateHTML(props.type, value);
      return (
        <Form style={{ minHeight: '100px', ...props.style }}>
          {form}
        </Form>
      );
    } catch (err) {
      console.error(err);
      return (
        <Message warning>
          <Message.Header>
            An error occured while generating this form
          </Message.Header>
          <pre>{err.message}</pre>
        </Message>
      );
    }
  }

  if (!props.type) {
    return (
      <Message warning>
        <Message.Header>No model type specified</Message.Header>
        <p>
          Please specify a model type to display the form.
        </p>
      </Message>
    );
  }

  return (
    <Message warning>
      <Message.Header>Invalid JSON instance provided</Message.Header>
      <p>
        The JSON value does not match the model type associated with this
        form.
      </p>
    </Message>
  );
};

ConcertoForm.defaultProps = {
  models: [],
  onValueChange: () => true,
  options: {},
  readOnly: false,
  style: {}
};

ConcertoForm.propTypes = {
  models: PropTypes.arrayOf(PropTypes.string).isRequired,
  type: PropTypes.string.isRequired,
  json: PropTypes.object,
  onValueChange: PropTypes.func.isRequired,
  options: PropTypes.object,
  readOnly: PropTypes.bool,
  style: PropTypes.object
};

export default ConcertoForm;
